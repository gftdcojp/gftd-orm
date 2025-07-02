import { KsqlDB, KsqlSchema, defineStream, defineTable } from '../src';

// Define schema using Drizzle-like syntax
const userActivitySchema = {
  userId: KsqlSchema.varchar('user_id').key(),
  username: KsqlSchema.varchar('username').notNull(),
  action: KsqlSchema.varchar('action').notNull(),
  timestamp: KsqlSchema.timestamp('timestamp').notNull(),
  metadata: KsqlSchema.struct('metadata').nullable(),
};

const userStatsSchema = {
  userId: KsqlSchema.varchar('user_id').key(),
  username: KsqlSchema.varchar('username').notNull(),
  totalActions: KsqlSchema.bigint('total_actions').notNull(),
  lastAction: KsqlSchema.varchar('last_action').nullable(),
  lastSeen: KsqlSchema.timestamp('last_seen').notNull(),
};

// Define streams and tables
const userActivityStream = defineStream('user_activities', userActivitySchema, {
  keyColumn: 'user_id',
  valueFormat: 'JSON',
  topic: 'user-activities',
  partitions: 3,
  replicas: 1,
});

const userStatsTable = defineTable('user_stats', userStatsSchema, {
  keyColumn: 'user_id',
  valueFormat: 'JSON',
  topic: 'user-stats',
});

async function main() {
  // Initialize KsqlDB connection
  const ksqldb = new KsqlDB({
    host: 'localhost',
    port: 8088,
  });

  // Register stream and table
  const activities = ksqldb.registerStream(userActivityStream);
  const stats = ksqldb.registerTable(userStatsTable);

  // Create stream and table in ksqlDB
  await ksqldb.createStream(userActivityStream);
  await ksqldb.createTable(userStatsTable);

  // Insert data
  await activities.insert({
    user_id: 'user123',
    username: 'john_doe',
    action: 'login',
    timestamp: new Date(),
    metadata: { ip: '192.168.1.1', device: 'mobile' },
  });

  // Query with type-safe builder (Supabase-like)
  const recentActivities = await activities
    .select('user_id', 'username', 'action', 'timestamp')
    .where(w => w
      .eq('username', 'john_doe')
      .gte('timestamp', new Date(Date.now() - 86400000))
    )
    .orderBy('timestamp', 'DESC')
    .limit(10)
    .execute();

  console.log('Recent activities:', recentActivities);

  // Query table
  const userStats = await stats
    .select()
    .where(w => w.eq('user_id', 'user123'))
    .execute();

  console.log('User stats:', userStats);

  // Stream real-time changes
  const unsubscribe = await activities
    .select()
    .where(w => w.eq('action', 'purchase'))
    .emitChanges()
    .stream(
      (message) => {
        console.log('New purchase:', message);
      },
      (error) => {
        console.error('Stream error:', error);
      }
    );

  // Complex aggregation query
  const aggregationQuery = `
    SELECT 
      username,
      COUNT(*) as action_count,
      COLLECT_LIST(action) as actions
    FROM user_activities
    WINDOW TUMBLING (SIZE 1 HOUR)
    GROUP BY username
    EMIT CHANGES;
  `;

  await ksqldb.stream(
    aggregationQuery,
    (result) => {
      console.log('Hourly stats:', result);
    }
  );

  // Cleanup (optional)
  // await ksqldb.dropStream('user_activities');
  // await ksqldb.dropTable('user_stats');
}

// Run the example
main().catch(console.error);