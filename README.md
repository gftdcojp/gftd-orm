# GFTD ORM

Enterprise-grade real-time data platform with ksqlDB foundation

🚀 **Real-time data platform for ksqlDB and Kafka**

An enterprise-grade real-time data platform that provides TypeScript-first integration with ksqlDB, Confluent Schema Registry, and Kafka streams.

## 🎯 Features

### 🔷 Database
- **Full TypeScript Support** - Type-safe schema definitions and field types
- **ksqlDB Integration** - Direct integration with ksqlDB for stream processing
- **Schema Registry** - Automatic Avro/JSON Schema management with Confluent Schema Registry

### ⚡ Realtime
- **WebSocket Communication** - Real-time data updates via WebSocket
- **Table Monitoring** - Monitor ksqlDB table changes
- **Stream Monitoring** - Monitor Kafka stream events
- **Presence Features** - User online status management
- **Broadcast** - Real-time message broadcasting

### 🛡️ Security & Monitoring
- **Audit Logging** - Comprehensive activity logging with Winston
- **Rate Limiting** - Built-in rate limiting and request throttling
- **Configuration Management** - Environment-based configuration

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GFTD ORM Client │    │ ksqlDB          │    │ Realtime        │
│ (TypeScript)    │    │ + Schema Reg.   │    │ (WebSocket)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                        ┌─────────────────┐    ┌─────────────────┐
                        │ Schema Registry │    │ Kafka Topics    │
                        │ (Avro/JSON)     │    │ (Events)        │
                        └─────────────────┘    └─────────────────┘
```

## 📦 Installation

```bash
npm install @gftdcojp/gftd-orm
# or
yarn add @gftdcojp/gftd-orm
# or
pnpm add @gftdcojp/gftd-orm
```



## 🚀 Quick Start

### 1. Client Creation and Configuration

```typescript
import { createClient } from '@gftdcojp/gftd-orm';

const client = createClient({
  url: process.env.GFTD_URL!,
  key: process.env.GFTD_SERVICE_ROLE_KEY!,
  
  // Database configuration (required)
  database: {
    ksql: {
      url: process.env.GFTD_DB_URL!,
      apiKey: process.env.GFTD_DB_API_KEY,
      apiSecret: process.env.GFTD_DB_API_SECRET,
    },
    schemaRegistry: {
      url: process.env.GFTD_SCHEMA_REGISTRY_URL!,
      auth: { 
        user: process.env.GFTD_SCHEMA_REGISTRY_AUTH_USER!, 
        pass: process.env.GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD! 
      },
    },
  },
  
  // Realtime configuration (optional)
  realtime: {
    url: process.env.GFTD_REALTIME_URL!,
    apiKey: process.env.GFTD_REALTIME_API_KEY,
    autoReconnect: true,
  },
});

// Initialize
await client.initialize();
```

### 2. Schema Definition

```typescript
import { defineSchema, FieldType } from '@gftdcojp/gftd-orm';

// Define user schema
const UserSchema = defineSchema('User', {
  id:       FieldType.UUID.primaryKey(),
  tenantId: FieldType.UUID.notNull(),
  name:     FieldType.STRING.notNull(),
  email:    FieldType.STRING.notNull(),
  created:  FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
});
```

### 3. ksqlDB Client Usage

```typescript
import { KsqlDbClient } from '@gftdcojp/gftd-orm';

const ksqlClient = new KsqlDbClient({
  url: 'http://localhost:8088',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
});

// Execute ksqlDB queries
const result = await ksqlClient.query('SHOW STREAMS;');

// Create stream
await ksqlClient.createStream({
  name: 'user_events',
  columns: {
    id: 'VARCHAR',
    event_type: 'VARCHAR',
    user_id: 'VARCHAR',
    timestamp: 'BIGINT'
  },
  topic: 'user-events',
  valueFormat: 'JSON'
});
```

### 4. Schema Registry Integration

```typescript
import { SchemaRegistry } from '@gftdcojp/gftd-orm';

const schemaRegistry = new SchemaRegistry({
  url: 'http://localhost:8081',
  auth: { user: 'admin', pass: 'admin' }
});

// Register schema
await schemaRegistry.registerSchema('user-value', {
  type: 'record',
  name: 'User',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' }
  ]
});

// Get schema
const schema = await schemaRegistry.getSchema('user-value', 'latest');
```

### 5. Realtime Monitoring

```typescript
// Create realtime channel
const channel = client.channel('user-changes');

// Monitor table changes
channel.onTable('users', 'INSERT', (payload) => {
  console.log('New user:', payload);
});

// Monitor stream events
channel.onStream('user_events', (payload) => {
  console.log('User event:', payload);
});

// Broadcast messages
await channel.broadcast('notifications', {
  type: 'user_joined',
  user: 'john@example.com',
});

// Connect to channel
await channel.connect();
```

### 6. Audit Logging

```typescript
import { AuditLogManager } from '@gftdcojp/gftd-orm';

// Log authentication events
AuditLogManager.logAuthSuccess('user-123', 'tenant-001', 'session-456', '192.168.1.1');

// Log data access
AuditLogManager.logDataAccess('user-123', 'tenant-001', 'read', 'users_table', true);

// Log security violations
AuditLogManager.logSecurityViolation('user-123', 'tenant-001', 'INVALID_TOKEN', {
  token: 'invalid-jwt-token',
  endpoint: '/api/users'
});

// Search logs
const logs = await AuditLogManager.searchLogs({
  userId: 'user-123',
  startDate: new Date('2024-01-01'),
  limit: 100
});
```

### 7. Rate Limiting

```typescript
import { RateLimitManager } from '@gftdcojp/gftd-orm';

// Check rate limit
const rateLimiter = RateLimitManager.getInstance({
  windowMs: 60000,  // 1 minute
  maxRequests: 100   // 100 requests per minute
});

const result = rateLimiter.checkLimit('user-123');
if (!result.allowed) {
  console.log('Rate limit exceeded');
  console.log('Reset time:', new Date(result.resetTime));
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Core Configuration
GFTD_URL=http://localhost:8088
GFTD_SERVICE_ROLE_KEY=your-service-role-key

# Database (ksqlDB)
GFTD_DB_URL=http://localhost:8088
GFTD_DB_API_KEY=your-api-key
GFTD_DB_API_SECRET=your-secret-key

# Schema Registry
GFTD_SCHEMA_REGISTRY_URL=http://localhost:8081
GFTD_SCHEMA_REGISTRY_AUTH_USER=admin
GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD=admin

# Realtime
GFTD_REALTIME_URL=ws://localhost:8088
GFTD_REALTIME_API_KEY=your-realtime-api-key

# Audit Logging
GFTD_AUDIT_ENABLED=true
GFTD_AUDIT_LOG_FILE=./logs/audit.log

# Rate Limiting
GFTD_RATE_LIMIT_WINDOW_MS=60000
GFTD_RATE_LIMIT_MAX_REQUESTS=100
```

## 📋 Available Commands

```bash
# Build
pnpm build

# Development
pnpm dev

# Testing
pnpm test
pnpm test:watch
pnpm test:coverage

# Code Quality
pnpm lint
pnpm format
```



## 📚 Documentation

- [**SECURITY.md**](SECURITY.md) - Comprehensive security guide
- [**env.example**](env.example) - Environment variable configuration example

## 🏥 Health Check

```typescript
const health = await client.health();
console.log(health);
// {
//   status: 'ok',
//   version: '25.07.4',
//   features: ['basic', 'minimal']
// }
```



## 🛠️ Development & CI/CD

### Testing Environment
- **Vitest**: Fast and lightweight test runner
- **Coverage**: Detailed coverage reports with v8 provider
- **TypeScript**: Strict type checking

### CI/CD Pipeline
- **Automated Testing**: Matrix testing on Node.js 18.x, 20.x
- **Code Quality**: ESLint + Prettier
- **Automated Deployment**: Automatic publishing to npm

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development setup.

## 🚧 Roadmap

### ✅ Completed
- [x] **ksqlDB Integration** - Complete integration with ksqlDB
- [x] **Schema Registry** - Confluent Schema Registry support
- [x] **Realtime Features** - WebSocket-based real-time updates
- [x] **Audit Logging** - Comprehensive activity logging
- [x] **Rate Limiting** - Request throttling and rate limiting
- [x] **TypeScript Support** - Full TypeScript definitions

### 🔄 Planned
- [ ] **Enhanced Query Builder** - Advanced ksqlDB query construction
- [ ] **Stream Processing Utilities** - Higher-level stream processing abstractions
- [ ] **Monitoring Dashboard** - Real-time monitoring interface
- [ ] **Performance Optimization** - Query and connection optimization

## 📝 License

**Business Source License (No Expiration)** - See the [LICENSE](LICENSE) file for details.

### 🎯 License Summary

- ✅ **Personal, Educational, Research**: Free to use
- ✅ **Internal Use**: OK for organizational use
- ✅ **Non-commercial Projects**: Free to use
- ✅ **Contributions**: Improvements and contributions welcome
- ⚠️ **Competing Services**: Restrictions on use in directly competing services
- ⚠️ **Managed Services**: Restrictions on hosting service offerings
- 💼 **Commercial Use**: Contact gftdcojp for commercial licensing

## 🤝 Contributing

Pull requests and issues are welcome.

### How to Contribute

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

---

With GFTD ORM, you can build **ksqlDB-based real-time data platforms** with **enterprise-grade TypeScript support**. 🚀