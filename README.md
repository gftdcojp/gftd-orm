# KsqlDB ORM

A TypeScript ORM mapper for ksqlDB inspired by Supabase ORM and Drizzle.

## Features

- 🔥 **Type-safe**: Full TypeScript support with schema inference
- 🚀 **Query Builder**: Fluent API similar to Supabase
- 📊 **Schema Definition**: Drizzle-inspired schema builder
- 🌊 **Streaming Support**: Real-time data streaming
- 💪 **Advanced Queries**: Window functions, aggregations, joins
- 🎯 **Connection Management**: Built-in connection pooling and error handling

## Installation

```bash
pnpm install ksqldb-orm
```

## Quick Start

### 1. Define Schema

```typescript
import { KsqlSchema, defineStream, defineTable } from 'ksqldb-orm';

// Define schema using Drizzle-like syntax
const userActivitySchema = {
  userId: KsqlSchema.varchar('user_id').key(),
  username: KsqlSchema.varchar('username').notNull(),
  action: KsqlSchema.varchar('action').notNull(),
  timestamp: KsqlSchema.timestamp('timestamp').notNull(),
  metadata: KsqlSchema.struct('metadata').nullable(),
};

// Define stream
const userActivityStream = defineStream('user_activities', userActivitySchema, {
  keyColumn: 'user_id',
  valueFormat: 'JSON',
  topic: 'user-activities',
});
```

### 2. Initialize Connection

```typescript
import { KsqlDB } from 'ksqldb-orm';

const ksqldb = new KsqlDB({
  host: 'localhost',
  port: 8088,
});

// Register stream
const activities = ksqldb.registerStream(userActivityStream);
```

### 3. Create Stream

```typescript
await ksqldb.createStream(userActivityStream);
```

### 4. Insert Data

```typescript
await activities.insert({
  user_id: 'user123',
  username: 'john_doe',
  action: 'login',
  timestamp: new Date(),
  metadata: { ip: '192.168.1.1' },
});
```

### 5. Query Data

```typescript
// Type-safe query builder
const results = await activities
  .select('user_id', 'username', 'action')
  .where(w => w
    .eq('username', 'john_doe')
    .gte('timestamp', new Date(Date.now() - 86400000))
  )
  .orderBy('timestamp', 'DESC')
  .limit(10)
  .execute();
```

### 6. Stream Real-time Data

```typescript
const unsubscribe = await activities
  .select()
  .where(w => w.eq('action', 'purchase'))
  .emitChanges()
  .stream(
    (message) => console.log('New purchase:', message),
    (error) => console.error('Stream error:', error)
  );
```

## Schema Types

```typescript
// Available column types
KsqlSchema.varchar('name')     // VARCHAR
KsqlSchema.string('name')      // STRING  
KsqlSchema.int('name')         // INT
KsqlSchema.bigint('name')      // BIGINT
KsqlSchema.double('name')      // DOUBLE
KsqlSchema.boolean('name')     // BOOLEAN
KsqlSchema.timestamp('name')   // TIMESTAMP
KsqlSchema.array('name')       // ARRAY
KsqlSchema.map('name')         // MAP
KsqlSchema.struct('name')      // STRUCT

// Column modifiers
.notNull()        // NOT NULL constraint
.nullable()       // Allow NULL values
.key()           // Primary key
.partitionKey()  // Partition key
.headers()       // Headers column
```

## Query Builder API

### Select Operations

```typescript
// Select specific columns
stream.select('col1', 'col2', 'col3')

// Select all columns
stream.select()
```

### Where Conditions

```typescript
stream.where(w => w
  .eq('column', 'value')           // column = 'value'
  .neq('column', 'value')          // column != 'value'
  .gt('column', 100)               // column > 100
  .gte('column', 100)              // column >= 100
  .lt('column', 100)               // column < 100
  .lte('column', 100)              // column <= 100
  .like('column', '%pattern%')     // column LIKE '%pattern%'
  .in('column', [1, 2, 3])         // column IN (1, 2, 3)
  .notIn('column', [1, 2, 3])      // column NOT IN (1, 2, 3)
  .isNull('column')                // column IS NULL
  .isNotNull('column')             // column IS NOT NULL
)
```

### Order By & Pagination

```typescript
stream
  .orderBy('timestamp', 'DESC')
  .limit(100)
  .offset(50)
```

### Aggregations

```typescript
stream
  .select('user_id', 'COUNT(*) as count')
  .groupBy('user_id')
  .having(w => w.gt('COUNT(*)', 10))
```

### Window Functions

```typescript
stream
  .select('user_id', 'COUNT(*) as hourly_count')
  .window('TUMBLING', '1 HOUR')
  .groupBy('user_id')
  .emitChanges()
```

## Advanced Features

### Complex Queries

```typescript
// Raw SQL execution
await ksqldb.execute(`
  CREATE STREAM processed_events AS
  SELECT 
    user_id,
    action,
    timestamp,
    CASE WHEN action = 'purchase' THEN total_amount ELSE 0 END as revenue
  FROM user_activities
  WHERE action IN ('login', 'purchase', 'logout')
  EMIT CHANGES;
`);
```

### Joins

```typescript
const joinQuery = `
  SELECT
    o.order_id,
    u.username,
    o.total_amount
  FROM orders o
  INNER JOIN users u
    WITHIN 1 HOUR
    ON o.user_id = u.user_id
  EMIT CHANGES;
`;

await ksqldb.query(joinQuery);
```

### Batch Operations

```typescript
// Insert multiple records
await stream.insertMany([
  { user_id: 'user1', action: 'login', timestamp: new Date() },
  { user_id: 'user2', action: 'logout', timestamp: new Date() },
]);
```

## Connection Configuration

```typescript
const ksqldb = new KsqlDB({
  host: 'localhost',
  port: 8088,
  username: 'admin',      // Optional
  password: 'password',   // Optional
  ssl: true,             // Optional, default: false
  timeout: 30000,        // Optional, default: 30000ms
});
```

## Error Handling

```typescript
try {
  const results = await stream.select().execute();
} catch (error) {
  console.error('Query failed:', error.message);
}

// Stream error handling
await stream.stream(
  (data) => console.log(data),
  (error) => console.error('Stream error:', error)
);
```

## Examples

See the [examples](./examples/) directory for complete usage examples:

- [Basic Usage](./examples/basic-usage.ts) - Simple CRUD operations
- [Advanced Usage](./examples/advanced-usage.ts) - Complex queries and real-time analytics

## API Reference

### KsqlDB Class

- `registerStream<T>(definition)` - Register a stream definition
- `registerTable<T>(definition)` - Register a table definition  
- `createStream(definition)` - Create stream in ksqlDB
- `createTable(definition)` - Create table in ksqlDB
- `dropStream(name)` - Drop stream
- `dropTable(name)` - Drop table
- `execute(ksql)` - Execute raw KSQL
- `query<T>(ksql)` - Execute query and return results
- `getClient()` - Get underlying client

### Stream/Table Classes

- `select(...fields)` - Start query builder
- `insert(data)` - Insert single record
- `insertMany(data[])` - Insert multiple records
- `upsert(data)` - Upsert record (tables only)

### QueryBuilder Class

- `where(condition)` - Add WHERE clause
- `orderBy(column, direction)` - Add ORDER BY clause
- `groupBy(...columns)` - Add GROUP BY clause
- `having(condition)` - Add HAVING clause
- `limit(n)` - Add LIMIT clause
- `offset(n)` - Add OFFSET clause
- `window(type, size)` - Add window function
- `emitChanges()` - Add EMIT CHANGES
- `execute()` - Execute query
- `stream(onMessage, onError)` - Stream results

## License

MIT