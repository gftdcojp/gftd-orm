# GFTD ORM

Enterprise-grade real-time data platform with ksqlDB foundation

🚀 **Real-time data platform for ksqlDB and Kafka**

An enterprise-grade real-time data platform that provides TypeScript-first integration with ksqlDB, Confluent Schema Registry, and Kafka streams.

## 🎯 Implementation Status

### ✅ Completed Features (95%+ Complete)

#### 📊 Core Features
- **TypeScript Type System**: Field type definitions, schema definitions
- **ksqlDB Client**: Complete implementation (DDL, DML, pull queries, push queries)
- **Schema Registry**: Complete implementation (schema registration, retrieval, compatibility checks)
- **Array-to-Object Conversion**: Automatic ksqlDB response transformation
- **TypeScript Type Generation**: Automatic type definition generation from ksqlDB schemas
- **CLI Commands**: Complete implementation (type generation, table listing, dry run, etc.)

#### 🛡️ Security Features
- **JWT Authentication**: Complete implementation (token generation, verification, refresh)
- **Auth0 Integration**: Complete implementation (default settings, custom configuration support)
- **Anonymous Key System**: Complete implementation (Supabase-style authentication)
- **Row Level Security (RLS)**: Complete implementation (policy management, access control)
- **Audit Logging**: Comprehensive logging functionality
- **Rate Limiting**: Multi-layer rate limiting functionality

#### ⚡ Realtime Features
- **Realtime Functionality**: WebSocket-based real-time communication
- **React Hooks**: Complete implementation (useGftdOrm, useBrowserClient, etc.)
- **Integrated Client**: Integration layer for all components

#### 🛠️ Developer Experience
- **High-level API**: Unified APIs like `createClient`, `defineSchema`, `init`, `healthCheck`
- **Comprehensive Testing**: Complete implementation (type generation, benchmarks, schemas)
- **Full TypeScript Support**: Type-safe development environment

## 🎯 Features

### 🔷 Database
- **Full TypeScript Support** - Type-safe schema definitions and field types
- **ksqlDB Integration** - Direct integration with ksqlDB for stream processing
- **Schema Registry** - Automatic Avro/JSON Schema management with Confluent Schema Registry
- **✅ Automatic Type Generation** - Generate TypeScript types from ksqlDB schemas
- **✅ Array-to-Object Conversion** - Automatic conversion of ksqlDB array responses to typed objects

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

### 🛠️ Developer Experience
- **✅ CLI Tools** - Command-line interface for type generation
- **✅ Type Safety** - Automatic TypeScript type generation from ksqlDB schemas
- **✅ Object Mapping** - Auto-generated mapper functions for array responses

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
                                 │
                        ┌─────────────────┐
                        │ CLI Type Gen    │
                        │ (TypeScript)    │
                        └─────────────────┘
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

### 1. ✅ Object Format Response (Completed Feature)

```typescript
import { executePullQuery, PullQueryOptions } from '@gftdcojp/gftd-orm';

// Default: Returns in object format
const result = await executePullQuery('SELECT * FROM users_table LIMIT 10;');
console.log(result.data);
// [
//   {
//     id: "user-123",
//     name: "John Doe",
//     email: "john@example.com",
//     created_at: "2024-01-01T00:00:00.000Z"
//   }
// ]

// To get array format (legacy behavior)
const options: PullQueryOptions = { format: 'array' };
const arrayResult = await executePullQuery('SELECT * FROM users_table LIMIT 10;', options);
console.log(arrayResult.data);
// [
//   ["user-123", "John Doe", "john@example.com", "2024-01-01T00:00:00.000Z"]
// ]
```

### 2. ✅ TypeScript Type Generation (Completed Feature)

#### CLI Commands for Type Generation

```bash
# Generate types for a single table
npx gftd-orm generate-types --table OSHIETE_SOURCES_TABLE --output ./types

# Generate types for all tables
npx gftd-orm generate-all --output ./types

# List all tables
npx gftd-orm list

# Set via environment variables
export GFTD_DB_URL="http://localhost:8088"
export GFTD_DB_API_KEY="your-api-key" 
export GFTD_DB_API_SECRET="your-secret"

# Or specify via options
npx gftd-orm generate-types \
  --table USERS_TABLE \
  --url http://localhost:8088 \
  --api-key your-key \
  --api-secret your-secret \
  --output ./types
```

#### Generated Type Definition Example

```typescript
// types/oshiete_sources.ts - Auto-generated file

/**
 * Generated TypeScript interface for ksqlDB table: OSHIETE_SOURCES_TABLE
 */
export interface OshieteSourcesTable {
  /** STRING */
  id: string;
  /** STRING (nullable) */
  title: string | null;
  /** STRING (nullable) */
  category: string | null;
  /** STRING */
  status: 'draft' | 'published' | 'archived';
  /** STRING (nullable) */
  content: string | null;
  /** TIMESTAMP */
  created_at: string;
  /** TIMESTAMP */
  updated_at: string;
  /** TIMESTAMP (nullable) */
  published_at: string | null;
  /** STRING (nullable) */
  author: string | null;
  /** ARRAY<STRING> (nullable) */
  tags: string[] | null;
}

/**
 * Generated mapper function for converting ksqlDB array response to OshieteSourcesTable object
 */
export function mapOshieteSourcesTableRow(row: any[]): OshieteSourcesTable {
  return {
    id: row[0],
    title: row[1],
    category: row[2],
    status: row[3] as 'draft' | 'published' | 'archived',
    content: row[4],
    created_at: row[5],
    updated_at: row[6],
    published_at: row[7],
    author: row[8],
    tags: Array.isArray(row[9]) ? row[9] : []
  };
}

/**
 * Generated column metadata for ksqlDB table: OSHIETE_SOURCES_TABLE
 */
export const OSHIETE_SOURCES_COLUMNS = {
  names: ['ID', 'TITLE', 'CATEGORY', 'STATUS', 'CONTENT', 'CREATED_AT', 'UPDATED_AT', 'PUBLISHED_AT', 'AUTHOR', 'TAGS'],
  types: ['STRING', 'STRING', 'STRING', 'STRING', 'STRING', 'TIMESTAMP', 'TIMESTAMP', 'TIMESTAMP', 'STRING', 'ARRAY<STRING>'],
  nullable: [false, true, true, false, true, false, false, true, true, true],
  keyColumns: [true, false, false, false, false, false, false, false, false, false]
} as const;
```

#### Using Generated Types

```typescript
import { executePullQuery } from '@gftdcojp/gftd-orm';
import { OshieteSourcesTable, mapOshieteSourcesTableRow } from './types/oshiete_sources';

// Type-safe query execution
const result = await executePullQuery('SELECT * FROM OSHIETE_SOURCES_TABLE LIMIT 10;');

// Automatically converted to object format (v25.07.8)
const sources: OshieteSourcesTable[] = result.data;

// Or manual mapping for array format
const arrayResult = await executePullQuery('SELECT * FROM OSHIETE_SOURCES_TABLE LIMIT 10;', { format: 'array' });
const mappedSources: OshieteSourcesTable[] = arrayResult.data.map(mapOshieteSourcesTableRow);

// Type-safe access
sources.forEach(source => {
  console.log(`Title: ${source.title}`); // TypeScript type checking enabled
  console.log(`Tags: ${source.tags?.join(', ') || 'No tags'}`); // null-safe
});
```

### 3. Programmatic Type Generation

```typescript
import { 
  getTableSchema, 
  generateCompleteTypeDefinition,
  listAllTables 
} from '@gftdcojp/gftd-orm';

// Generate types for a single table
const schema = await getTableSchema('USERS_TABLE');
const typeInfo = generateCompleteTypeDefinition(schema);

console.log(typeInfo.fullCode);
// Complete TypeScript type definition is output

// Get list of all tables
const tables = await listAllTables();
console.log('Available tables:', tables.map(t => t.name));
```

### 4. ✅ Auth0 Integration Usage (Completed Feature)

```typescript
import { createAuth0Client, auth0 } from '@gftdcojp/gftd-orm';

// 1. Use Auth0 token with default settings (no configuration needed)
const auth0Token = "eyJ..."; // JWT token obtained from Auth0
const client = createAuth0Client('http://localhost:8088', auth0Token);
// Default: Uses gftd.jp.auth0.com domain

// 2. For custom Auth0 configuration
const customClient = createAuth0Client('http://localhost:8088', auth0Token, {
  auth0Config: {
    domain: 'your-custom.auth0.com',
    audience: 'https://your-api-identifier',
    clientId: 'your-custom-client-id',
  }
});

// 3. Check authentication status
console.log('Authentication Status:', {
  isAuthenticated: client.auth.isAuthenticated,
  user: client.auth.user,
  error: client.auth.error,
});

// 4. Secure data access (RLS automatically applied)
const { data, error } = await client.query(`
  SELECT id, name, email, created_at 
  FROM user_profiles 
  WHERE status = 'active'
`);

// 5. Permission & role-based access control
if (client.hasPermission('read:sensitive_data')) {
  const { data } = await client.query('SELECT * FROM sensitive_table');
}

if (client.hasRole('admin')) {
  // Admin-only operations
}

// 6. Real-time streaming
const subscription = await client.stream(
  'SELECT * FROM user_activity EMIT CHANGES',
  (update) => console.log('Real-time update:', update)
);

// 7. Express.js middleware usage
import { createAuth0Middleware } from '@gftdcojp/gftd-orm';

// Using middleware with default settings
app.use('/api/protected', createAuth0Middleware({
  requiredPermissions: ['read:data'],
  requiredRoles: ['user'],
}));

// Using middleware with custom Auth0 configuration
app.use('/api/custom', createAuth0Middleware({
  requiredPermissions: ['read:data'],
  requiredRoles: ['user'],
  auth0Config: {
    domain: 'your-custom.auth0.com',
    audience: 'https://your-api-identifier',
  }
}));

app.get('/api/protected/users', async (req, res) => {
  const { data } = await req.gftdClient.query('SELECT * FROM users');
  res.json({ users: data });
});
```

### 5. ✅ Supabase-style Authentication System Usage (Anonymous Key)

```typescript
import { createClient, getKeys, rls } from '@gftdcojp/gftd-orm';

// 1. Get anonymous key (auto-generated on first startup)
const keys = getKeys();
console.log('Public anonymous key:', keys.anonKey);
console.log('Server-only key:', keys.serviceRoleKey); // Never expose this publicly

// 2. Create client (frontend)
const client = createClient('http://localhost:8088', keys.anonKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});

// 3. Secure data access (RLS automatically applied)
const { data, error } = await client.query(`
  SELECT id, name, email, created_at 
  FROM user_profiles 
  WHERE status = 'active'
`);

if (error) {
  console.error('Access denied:', error);
} else {
  console.log('Retrieved data:', data);
}

// 4. Real-time streaming
const subscription = await client.stream(
  'SELECT * FROM user_activity EMIT CHANGES',
  (update) => {
    console.log('Real-time update:', update);
  }
);

// 5. RLS policy configuration (admin only)
rls.enableTableRLS('user_profiles');
rls.createPolicy({
  id: 'authenticated-user-access',
  name: 'Authenticated User Access',
  tableName: 'user_profiles',
  policyType: 'SELECT',
  roles: ['authenticated'],
  condition: 'user_id = auth.user_id()',
  description: 'Users can only see their own profile',
  isActive: true,
});

// 6. Check authentication status
console.log('Authentication info:', {
  isAuthenticated: client.auth.isAuthenticated,
  isAnonymous: client.auth.isAnonymous,
  user: client.auth.user,
});
```

### 6. Basic Usage (Legacy Features)

```typescript
import { 
  initializeKsqlDbClient, 
  executeQuery, 
  executePullQuery,
  initializeSchemaRegistryClient, 
  registerSchema,
  createRealtime,
  AuditLogManager,
  RateLimitManager 
} from '@gftdcojp/gftd-orm';

// Initialize ksqlDB client
initializeKsqlDbClient({
  url: 'http://localhost:8088',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
});

// Execute queries (automatically in object format)
const result = await executePullQuery('SELECT * FROM users_table LIMIT 10;');
console.log(result.data); // Array of objects

// Initialize Schema Registry
initializeSchemaRegistryClient({
  url: 'http://localhost:8081',
  auth: { user: 'admin', pass: 'admin' }
});

// Register schema
await registerSchema('user-value', {
  type: 'record',
  name: 'User',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' }
  ]
});

// Realtime features
const realtime = createRealtime({
  url: 'ws://localhost:8088',
  apiKey: 'your-api-key'
});

const channel = realtime.channel('user-changes');
await channel.connect();
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

# Auth0 Integration (Default values pre-configured - override only if needed)
AUTH0_DOMAIN=gftd.jp.auth0.com
AUTH0_AUDIENCE=https://gftd.jp.auth0.com/api/v2/
AUTH0_CLIENT_ID=k0ziPQ6IkDxE1AUSvzx5PwXtnf4y81x0
AUTH0_JWKS_URI=https://gftd.jp.auth0.com/.well-known/jwks.json

# Audit Logging
GFTD_AUDIT_ENABLED=true
GFTD_AUDIT_LOG_FILE=./logs/audit.log

# Rate Limiting
GFTD_RATE_LIMIT_WINDOW_MS=60000
GFTD_RATE_LIMIT_MAX_REQUESTS=100
```

### 🔐 About Auth0 Configuration

**Default Settings**:
- `AUTH0_DOMAIN`: `gftd.jp.auth0.com` (pre-configured)
- `AUTH0_CLIENT_ID`: `k0ziPQ6IkDxE1AUSvzx5PwXtnf4y81x0` (pre-configured)

Environment variable configuration is **optional**. Only set these if you're using a different Auth0 tenant.

**Programmatic Configuration**:
```typescript
// Use default settings (recommended)
const client = createAuth0Client(ksqlDbUrl, auth0Token);

// Use custom configuration
const client = createAuth0Client(ksqlDbUrl, auth0Token, {
  auth0Config: {
    domain: 'your-custom.auth0.com',
    audience: 'https://your-api-identifier',
  }
});
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

# ✅ CLI Commands
npx gftd-orm list                           # List all tables
npx gftd-orm generate-types --table <name>  # Generate types for single table
npx gftd-orm generate-all                   # Generate types for all tables

# Development CLI (for contributors)
pnpm cli:list                              # List all tables
pnpm cli:generate --table <name>          # Generate types for single table
pnpm cli:generate-all                     # Generate types for all tables
```

## 🚧 Roadmap

### ✅ Completed
- [x] **ksqlDB Integration** - Complete integration with ksqlDB
- [x] **Schema Registry** - Confluent Schema Registry support
- [x] **Realtime Features** - WebSocket-based real-time updates
- [x] **Audit Logging** - Comprehensive activity logging
- [x] **Rate Limiting** - Request throttling and rate limiting
- [x] **TypeScript Support** - Full TypeScript definitions
- [x] **Unified Client API** - Integrated client interface
- [x] **Schema Definition Integration** - High-level schema definition API
- [x] **✅ Array-to-Object Conversion** - Automatic response transformation
- [x] **✅ TypeScript Type Generation** - CLI-based type generation from ksqlDB schemas
- [x] **✅ TABLE_table Duplication Fix** - Resolved table naming issues

### 🔮 Planned
- [ ] **Enhanced Query Builder** - Advanced ksqlDB query construction
- [ ] **Stream Processing Utilities** - Higher-level stream processing abstractions
- [ ] **Monitoring Dashboard** - Real-time monitoring interface
- [ ] **Performance Optimization** - Query and connection optimization
- [ ] **VS Code Extension** - IDE integration for type generation
- [ ] **Watch Mode** - Automatic type regeneration on schema changes

## ✅ v25.07.8 Completed Features Details

### 1. 🔐 Auth0 Integration System (Completed Feature)

**Implementation Details**:
- **Auth0 JWT Verification**: Secure token validation using JWKS (JSON Web Key Set)
- **Automatic User Mapping**: Convert Auth0 claims to GFTD ORM user payload
- **Permission & Role Integration**: Fine-grained access control via Auth0 custom claims
- **Automatic RLS Application**: Row Level Security based on Auth0 user information

**Usage Example**:
```typescript
import { createAuth0Client } from '@gftdcojp/gftd-orm';

// Authenticate with Auth0 token (full integration with existing Auth0 systems)
const client = createAuth0Client('http://localhost:8088', auth0Token);

// Permission-based secure data access
if (client.hasPermission('read:data')) {
  const { data } = await client.query('SELECT * FROM users');
}
```

### 2. 🔐 Supabase-style Authentication System (Completed Feature)

**Implementation Details**:
- **JWT Authentication System**: Token generation, verification, and refresh functionality
- **Anonymous Key System**: Public-safe anonymous key and service role key
- **Row Level Security (RLS)**: Dynamic filtering of ksqlDB queries
- **Integrated Client**: Supabase-like API design

**Usage Example**:
```typescript
import { createClient, getKeys } from '@gftdcojp/gftd-orm';

// Secure access with anonymous key (public-safe)
const keys = getKeys();
const client = createClient('http://localhost:8088', keys.anonKey!);

// Query execution with automatic RLS application
const { data, error } = await client.query('SELECT * FROM users');
```

### 3. 🛡️ Row Level Security (RLS)

**Features**:
- Table-level access control
- User role-based policy management
- Dynamic WHERE clause injection
- Supabase-compatible policy syntax

**Policy Example**:
```typescript
import { rls } from '@gftdcojp/gftd-orm';

// Users can only access their own data
rls.createPolicy({
  id: 'user-owns-data',
  name: 'User Owns Data',
  tableName: 'user_profiles',
  policyType: 'SELECT',
  roles: ['authenticated'],
  condition: 'user_id = auth.user_id()',
  description: 'Users can only access their own data',
  isActive: true,
});
```

### 4. 🔑 Anonymous Key System

**Features**:
- **Anonymous Key**: Safe for frontend use
- **Service Role Key**: Backend-only full permission key
- **Automatic JWT Generation**: Key-based authentication with automatic JWT token issuance
- **Permission Management**: Fine-grained permissions per key

### 5. 🌐 Confluent Cloud Support

**Coverage**:
- Full integration with Confluent Cloud ksqlDB
- Schema Registry integration
- SSL/TLS connection support
- Enterprise security features

### 6. Existing Feature Improvements

#### Array Format Response Issue Resolution
- Added format option to `executePullQuery`
- Default `format: 'object'` returns object format
- Backward compatibility with `format: 'array'` option

#### TypeScript Type Generation Feature
- Automatic TypeScript type definition generation from ksqlDB schemas
- Auto-generated mapper functions for array→object conversion
- Column metadata generation
- Bulk generation via CLI commands

#### Table Name Duplication Issue Fix
- Automatic removal of `_table`, `_stream` suffixes during type generation
- Proper handling of special characters
- Generation of more readable interface names

## 📚 Migration Guide

### v25.07.5 → v25.07.8

#### If you were using array responses

```typescript
// Before (v25.07.5)
const result = await executePullQuery('SELECT * FROM users;');
const users = result.data.map(row => ({
  id: row[0],
  name: row[1],
  email: row[2]
}));

// After (v25.07.8) - automatic conversion
const result = await executePullQuery('SELECT * FROM users;');
const users = result.data; // already in object format

// If array format is needed
const result = await executePullQuery('SELECT * FROM users;', { format: 'array' });
```

#### Adding Type Generation

```bash
# Generate type definitions
npx gftd-orm generate-types --table USERS_TABLE --output ./types

# Use in TypeScript files
import { UsersTable } from './types/users';
```

## 📝 License

**Business Source License (No Expiration)** - See the [LICENSE](LICENSE) file for details.

---

With GFTD ORM v25.07.8, you can build **ksqlDB-based real-time data platforms** with **enterprise-grade TypeScript support** and **automatic type generation**. 🚀