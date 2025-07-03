/**
 * Materialized View デモ - リアルタイム集計とダッシュボード
 */

import { defineSchema, defineModel, StreamType, FieldType, init } from '../src';

// ユーザーアクションストリーム
const UserActionSchema = defineSchema('UserAction', {
  id: FieldType.UUID.primaryKey(),
  userId: FieldType.UUID.notNull(),
  tenantId: FieldType.UUID.notNull(),
  action: FieldType.STRING.notNull(), // 'login', 'logout', 'purchase', 'view'
  timestamp: FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
  amount: FieldType.DECIMAL(10, 2), // 購入額など（nullable）
  metadata: FieldType.STRING, // JSON文字列
});

const UserAction = defineModel({
  schema: UserActionSchema,
  type: StreamType.STREAM,
  topic: 'user_actions',
  key: 'id',
});

// 1. リアルタイムユーザー統計（1分間隔）
const UserStatsSchema = defineSchema('UserStats', {
  tenantId: FieldType.UUID.notNull(),
  windowStart: FieldType.TIMESTAMP.notNull(),
  windowEnd: FieldType.TIMESTAMP.notNull(),
  totalActions: FieldType.LONG.notNull(),
  uniqueUsers: FieldType.LONG.notNull(),
  totalPurchases: FieldType.LONG.notNull(),
  totalRevenue: FieldType.DECIMAL(15, 2).notNull(),
});

const UserStats = defineModel({
  schema: UserStatsSchema,
  type: StreamType.MATERIALIZED_VIEW,
  topic: 'user_stats_mv',
  key: 'tenantId',
  sqlOptions: {
    materializedView: {
      sourceStream: 'user_actions',
      groupBy: ['tenantId'],
      aggregations: {
        '*': 'COUNT',
        'userId': 'COUNT(DISTINCT userId)',
        'CASE WHEN action = \'purchase\' THEN 1 END': 'COUNT',
        'CASE WHEN action = \'purchase\' THEN amount END': 'SUM',
      },
      windowConfig: {
        type: 'TUMBLING',
        size: '1 MINUTE',
      },
    },
  },
});

// 2. 売上ダッシュボード（時間別）
const RevenueByHourSchema = defineSchema('RevenueByHour', {
  tenantId: FieldType.UUID.notNull(),
  hour: FieldType.TIMESTAMP.notNull(),
  totalRevenue: FieldType.DECIMAL(15, 2).notNull(),
  orderCount: FieldType.LONG.notNull(),
  avgOrderValue: FieldType.DECIMAL(10, 2).notNull(),
});

const RevenueByHour = defineModel({
  schema: RevenueByHourSchema,
  type: StreamType.MATERIALIZED_VIEW,
  topic: 'revenue_by_hour_mv',
  key: 'tenantId',
  sqlOptions: {
    materializedView: {
      query: `
        SELECT 
          tenantId,
          WINDOWSTART as hour,
          SUM(amount) as totalRevenue,
          COUNT(*) as orderCount,
          AVG(amount) as avgOrderValue
        FROM user_actions
        WHERE action = 'purchase'
        WINDOW TUMBLING (SIZE 1 HOUR)
        GROUP BY tenantId
      `,
    },
  },
});

// 3. トップユーザー（累積）
const TopUsersSchema = defineSchema('TopUsers', {
  tenantId: FieldType.UUID.notNull(),
  userId: FieldType.UUID.notNull(),
  totalSpent: FieldType.DECIMAL(15, 2).notNull(),
  orderCount: FieldType.LONG.notNull(),
  lastPurchase: FieldType.TIMESTAMP,
});

const TopUsers = defineModel({
  schema: TopUsersSchema,
  type: StreamType.MATERIALIZED_VIEW,
  topic: 'top_users_mv',
  key: 'userId',
  sqlOptions: {
    materializedView: {
      sourceStream: 'user_actions',
      groupBy: ['tenantId', 'userId'],
      aggregations: {
        'amount': 'SUM',
        '*': 'COUNT',
        'timestamp': 'MAX',
      },
    },
  },
});

/**
 * デモ実行
 */
async function runMaterializedViewDemo() {
  console.log('🎯 Materialized View Demo\n');

  // 初期化
  await init({
    ksql: {
      url: process.env.KSQLDB_URL || 'http://localhost:8088',
      apiKey: process.env.KSQLDB_KEY,
      apiSecret: process.env.KSQLDB_SECRET,
    },
    schemaRegistry: {
      url: process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081',
      auth: {
        user: process.env.SCHEMA_REGISTRY_USER || 'admin',
        pass: process.env.SCHEMA_REGISTRY_PASS || 'admin',
      },
    },
  });

  console.log('✅ Materialized Views created automatically!\n');

  // サンプルデータ投入
  console.log('📊 Inserting sample data...\n');
  
  const sampleActions = [
    {
      id: 'action-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      action: 'login',
      timestamp: new Date(),
    },
    {
      id: 'action-2',
      userId: 'user-1',
      tenantId: 'tenant-1',
      action: 'purchase',
      timestamp: new Date(),
      amount: 29.99,
    },
    {
      id: 'action-3',
      userId: 'user-2',
      tenantId: 'tenant-1',
      action: 'purchase',
      timestamp: new Date(),
      amount: 99.99,
    },
  ];

  for (const action of sampleActions) {
    await UserAction.insert(action);
  }

  console.log('✅ Sample data inserted\n');

  // Materialized View からデータを取得
  console.log('📈 Querying materialized views...\n');

  // リアルタイム統計
  const stats = await UserStats.findMany({
    where: { tenantId: 'tenant-1' },
    orderBy: { windowStart: 'desc' },
    limit: 5,
  });
  console.log('📊 User Stats (last 5 minutes):', stats);

  // 売上統計
  const revenueStats = await RevenueByHour.findMany({
    where: { tenantId: 'tenant-1' },
    orderBy: { hour: 'desc' },
    limit: 24, // 過去24時間
  });
  console.log('💰 Revenue by Hour (last 24h):', revenueStats);

  // トップユーザー
  const topUsers = await TopUsers.findMany({
    where: { tenantId: 'tenant-1' },
    orderBy: { totalSpent: 'desc' },
    limit: 10,
  });
  console.log('👑 Top Users:', topUsers);

  console.log('\n🎉 Materialized View Demo completed!');
}

// デモ実行
if (require.main === module) {
  runMaterializedViewDemo().catch(console.error);
}

export { runMaterializedViewDemo }; 