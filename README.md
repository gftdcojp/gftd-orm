# GFTD ORM

Enterprise-grade real-time data platform with ksqlDB, inspired by Supabase architecture

🚀 **Unified platform for Database, Realtime, Storage, Auth**

An enterprise-grade real-time data platform that provides **Supabase-like unified API** for Database (type-safe ORM), Realtime (WebSocket), Storage (S3 compatible), and Auth (JWT authentication) built on Confluent Schema Registry + ksqlDB foundation.

## 🎯 Features

### 🔷 Database
- **Full TypeScript Support** - Type-safe DSL similar to Drizzle ORM
- **ksqlDB Integration** - Stream/Table mapping with real-time processing  
- **Row-Level Security** - Policy-based row-level security
- **Schema Registry** - Automatic Avro/JSON Schema management

### ⚡ Realtime
- **WebSocket Communication** - Real-time data updates
- **Table Monitoring** - INSERT/UPDATE/DELETE events
- **Stream Monitoring** - Kafka stream events
- **Presence Features** - User online status management
- **Broadcast** - Real-time communication

### 🗄️ Storage
- **S3 Compatible** - MinIO/AWS S3 support
- **File Management** - Upload/Download/Delete operations
- **Signed URLs** - Secure file access
- **Bucket Management** - Multiple storage management

### 🔐 Auth
- **JWT Authentication** - Secure token-based authentication
- **OAuth Support** - Google, GitHub and other providers
- **User Management** - Registration/Login/Password management
- **Session Management** - Automatic refresh support

### 🛡️ Security
- **Comprehensive Security** - Enterprise-grade security features
- **SQL Injection Prevention** - Parameterized queries and escape processing
- **Rate Limiting & DDoS Protection** - Multi-layered access control
- **Audit Logging** - Detailed recording of all activities
- **Encryption & Hashing** - bcrypt password protection
- **CSRF/XSS Protection** - Cross-site attack prevention

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GFTD ORM Client │    │ Database        │    │ Realtime        │    │ Storage         │
│ (Supabase-like) │    │ (ksqlDB + SR)   │    │ (WebSocket)     │    │ (S3 compatible) │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         └───────────────────────┼───────────────────────┼───────────────────────┘
                                 │                       │                       
┌─────────────────┐              │              ┌─────────────────┐    ┌─────────────────┐
│ Auth            │              │              │ Kafka Topics    │    │ File Storage    │
│ (JWT)           │              │              │ (Events)        │    │ (Buckets)       │
└─────────────────┘              │              └─────────────────┘    └─────────────────┘
                                 │                       
                        ┌─────────────────┐
                        │ Schema Registry │
                        │ (Avro/JSON)     │
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

## 🔥 Complete Next.js Support

GFTD-ORM is designed to work seamlessly with **Next.js App Router** on both **server-side** and **client-side**.

### Environment-specific Imports (Supabase-like)

```typescript
// Browser-only (Client Components) - Secure, lightweight
import { createBrowserClient } from '@gftdcojp/gftd-orm/browser';

// Server-only (Server Components, API Routes, Server Actions) - Full features
import { createServerClient } from '@gftdcojp/gftd-orm/server';

// Universal (legacy compatibility, deprecated)
import { createClient } from '@gftdcojp/gftd-orm';
```

**🔥 Important: Benefits of Environment-specific Clients**

- **Security** - Sensitive information (API secrets, etc.) is not sent to the browser
- **Bundle Size Optimization** - Excludes unnecessary dependencies for each environment
- **Type Safety** - Provides only appropriate APIs for each environment
- **Explicitness** - Developers intentionally choose the environment

### Usage in Server Components

```typescript
// app/page.tsx
import { createServerClient } from '@gftdcojp/gftd-orm/server';

const client = createServerClient({
  url: process.env.GFTD_URL!,
  key: process.env.GFTD_SERVICE_ROLE_KEY!, // Only available on server
  database: {
    ksql: {
      url: process.env.GFTD_DB_URL!,
      apiKey: process.env.GFTD_DB_API_KEY,
      apiSecret: process.env.GFTD_DB_API_SECRET, // Only available on server
    },
    schemaRegistry: {
      url: process.env.GFTD_SCHEMA_REGISTRY_URL!,
      auth: { 
        user: process.env.GFTD_SCHEMA_REGISTRY_AUTH_USER!, // Only available on server
        pass: process.env.GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD! // Only available on server
      },
    },
  },
  storage: {
    bucketName: process.env.GFTD_STORAGE_BUCKET!,
    endpoint: process.env.GFTD_STORAGE_ENDPOINT!,
    accessKeyId: process.env.GFTD_STORAGE_ACCESS_KEY!, // Only available on server
    secretAccessKey: process.env.GFTD_STORAGE_SECRET_KEY!, // Only available on server
  },
  auth: {
    jwtSecret: process.env.GFTD_JWT_SECRET!, // Only available on server
  },
});

export default async function Page() {
  await client.initialize();
  
  const { data: users } = await client
    .from('users')
    .select('*')
    .eq('status', 'active')
    .execute();

  return (
    <div>
      <h1>User List</h1>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Realtime in Client Components

```typescript
// app/realtime-dashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@gftdcojp/gftd-orm/browser';

const client = createBrowserClient({
  url: process.env.NEXT_PUBLIC_GFTD_URL!,
  key: process.env.NEXT_PUBLIC_GFTD_ANON_KEY!, // Public API key only
  database: {
    ksql: {
      url: process.env.NEXT_PUBLIC_GFTD_DB_URL!,
      apiKey: process.env.NEXT_PUBLIC_GFTD_DB_API_KEY, // Public API key only
      // apiSecret is not available (security)
    },
    schemaRegistry: {
      url: process.env.NEXT_PUBLIC_GFTD_SCHEMA_REGISTRY_URL!,
      apiKey: process.env.NEXT_PUBLIC_GFTD_SCHEMA_REGISTRY_API_KEY, // Public API key only
    },
  },
  realtime: {
    url: process.env.NEXT_PUBLIC_GFTD_REALTIME_URL!,
    apiKey: process.env.NEXT_PUBLIC_GFTD_REALTIME_API_KEY, // Public API key only
  },
  // storage, auth are limited (URL only)
});

export default function RealtimeDashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const initialize = async () => {
      await client.initialize();
      setIsConnected(true);

      // Real-time monitoring
      const channel = client.channel('user-updates');
      channel.onTable('users', 'INSERT', (payload) => {
        console.log('New user:', payload);
        setUsers(prev => [...prev, payload.new]);
      });
      await channel.connect();
    };

    initialize();
  }, []);

  return (
    <div>
      <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>User Count: {users.length}</p>
    </div>
  );
}
```

### Usage in API Routes

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@gftdcojp/gftd-orm/server';

export async function GET() {
  const client = createServerClient({
    url: process.env.GFTD_URL!,
    key: process.env.GFTD_SERVICE_ROLE_KEY!, // Safe on server only
    database: {
      ksql: {
        url: process.env.GFTD_DB_URL!,
        apiKey: process.env.GFTD_DB_API_KEY,
        apiSecret: process.env.GFTD_DB_API_SECRET, // Safe on server only
      },
      schemaRegistry: {
        url: process.env.GFTD_SCHEMA_REGISTRY_URL!,
        auth: { 
          user: process.env.GFTD_SCHEMA_REGISTRY_AUTH_USER!, // Safe on server only
          pass: process.env.GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD! // Safe on server only
        },
      },
    },
  });

  await client.initialize();
  const { data } = await client.from('users').select('*').execute();
  
  return NextResponse.json({ data });
}
```

### React Hooks (Currently in Development)

```typescript
// Coming in future releases
import { useBrowserClient, useRealtimeSubscription } from '@gftdcojp/gftd-orm/hooks';

function UserList() {
  const { client, isConnected } = useBrowserClient({
    url: process.env.NEXT_PUBLIC_GFTD_URL!,
    key: process.env.NEXT_PUBLIC_GFTD_ANON_KEY!,
    database: {
      ksql: { url: process.env.NEXT_PUBLIC_GFTD_DB_URL! },
      schemaRegistry: { url: process.env.NEXT_PUBLIC_GFTD_SCHEMA_REGISTRY_URL! },
    },
  });

  // Real-time monitoring
  useRealtimeSubscription(client, 'users', 'INSERT', (payload) => {
    console.log('New user:', payload);
  });

  return (
    <div>
      <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
    </div>
  );
}
```

### Environment Variables Configuration

```bash
# .env.local (Next.js project)

# 🔒 Server-only (Sensitive information)
GFTD_URL=http://localhost:8088
GFTD_SERVICE_ROLE_KEY=your-service-role-key       # ⚠️ Sensitive
GFTD_JWT_SECRET=your-super-secret-jwt-key         # ⚠️ Sensitive

# Database (ksqlDB)
GFTD_DB_URL=http://localhost:8088
GFTD_DB_API_KEY=your-api-key
GFTD_DB_API_SECRET=your-secret-key                # ⚠️ Sensitive

# Schema Registry
GFTD_SCHEMA_REGISTRY_URL=http://localhost:8081
GFTD_SCHEMA_REGISTRY_AUTH_USER=admin              # ⚠️ Sensitive
GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD=admin          # ⚠️ Sensitive

# Storage (S3 Compatible)
GFTD_STORAGE_ENDPOINT=http://localhost:9000
GFTD_STORAGE_ACCESS_KEY=minioadmin                # ⚠️ Sensitive
GFTD_STORAGE_SECRET_KEY=minioadmin                # ⚠️ Sensitive
GFTD_STORAGE_BUCKET=uploads

# Realtime
GFTD_REALTIME_URL=ws://localhost:8088
GFTD_REALTIME_API_KEY=your-realtime-api-key       # ⚠️ Sensitive

# 🌍 Client public (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_GFTD_URL=http://localhost:8088
NEXT_PUBLIC_GFTD_ANON_KEY=your-anon-key           # 📢 Public key

# Database (ksqlDB) - Client
NEXT_PUBLIC_GFTD_DB_URL=http://localhost:8088
NEXT_PUBLIC_GFTD_DB_API_KEY=your-public-api-key   # 📢 Public key

# Schema Registry - Client
NEXT_PUBLIC_GFTD_SCHEMA_REGISTRY_URL=http://localhost:8081
NEXT_PUBLIC_GFTD_SCHEMA_REGISTRY_API_KEY=your-public-schema-key  # 📢 Public key

# Realtime - Client
NEXT_PUBLIC_GFTD_REALTIME_URL=ws://localhost:8088
NEXT_PUBLIC_GFTD_REALTIME_API_KEY=your-public-realtime-key      # 📢 Public key
```

**🔐 Critical Security Notes:**

- `NEXT_PUBLIC_*` variables are sent to the browser, so only set **public API keys**
- `GFTD_SERVICE_ROLE_KEY`, `GFTD_DB_API_SECRET`, `GFTD_SCHEMA_REGISTRY_AUTH_*`, `GFTD_STORAGE_*_KEY`, `GFTD_JWT_SECRET` should **NEVER** be prefixed with `NEXT_PUBLIC_*`
- Browser clients are recommended for read-only operations; write operations should go through the server

## 🚀 Quick Start

### 1. Client Creation and Initialization

```typescript
import { createClient } from '@gftdcojp/gftd-orm';

const client = createClient({
  url: process.env.GFTD_URL!,
  key: process.env.GFTD_SERVICE_ROLE_KEY!,
  
  // Database configuration (required)
  database: {
    ksql: {
      url: process.env.GFTD_DB_URL!,
      apiKey: process.env.GFTD_DB_API_KEY!,
      apiSecret: process.env.GFTD_DB_API_SECRET!,
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
    apiKey: process.env.GFTD_REALTIME_API_KEY!,
    autoReconnect: true,
  },
  
  // Storage configuration (optional)
  storage: {
    bucketName: process.env.GFTD_STORAGE_BUCKET!,
    endpoint: process.env.GFTD_STORAGE_ENDPOINT!,
    accessKeyId: process.env.GFTD_STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.GFTD_STORAGE_SECRET_KEY!,
  },
  
  // Auth configuration (optional)
  auth: {
    jwtSecret: process.env.GFTD_JWT_SECRET!,
  },
});

// Initialize
await client.initialize();
```

### 2. Database Operations (Supabase-like)

```typescript
// Data retrieval
const { data, error } = await client
  .from('users')
  .select('*')
  .eq('status', 'active')
  .order('created', false)
  .limit(10)
  .execute();

// Data insertion
const { data: newUser } = await client
  .from('users')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active',
  });

// Data update
const { data: updatedUser } = await client
  .from('users')
  .eq('id', 'user-123')
  .update({ status: 'premium' });

// Data deletion
const { data } = await client
  .from('users')
  .eq('id', 'user-123')
  .delete();

// Direct SQL execution
const result = await client.sql('SELECT COUNT(*) FROM users_table');
```

### 3. Realtime Monitoring

```typescript
// Create channel
const channel = client.channel('user-changes');

// Table change monitoring
channel.onTable('users', 'INSERT', (payload) => {
  console.log('New user:', payload);
});

channel.onTable('users', 'UPDATE', (payload) => {
  console.log('User updated:', payload);
});

// Stream monitoring
channel.onStream('messages', (payload) => {
  console.log('New message:', payload);
});

// Broadcast
channel.onBroadcast('notifications', (payload) => {
  console.log('Notification:', payload);
});

// Presence features
channel.presence.track({ status: 'online' });
channel.presence.onChange((payload) => {
  console.log('Presence changed:', payload);
});

// Start connection
await channel.connect();

// Send message
await channel.broadcast('notifications', {
  type: 'user_joined',
  user: 'john@example.com',
});
```

### 4. Storage Operations

```typescript
// File upload
const { data: file } = await client.storage.upload(
  'avatars/user.jpg',
  fileBuffer,
  { contentType: 'image/jpeg' }
);

// File download
const { data: fileData } = await client.storage.download('avatars/user.jpg');

// File listing
const { data: files } = await client.storage.list('avatars/');

// Generate signed URL
const { data: signedUrl } = client.storage.createSignedUrl('avatars/user.jpg', 3600);

// Get public URL
const { data: publicUrl } = client.storage.getPublicUrl('avatars/user.jpg');

// Bucket management
await client.storage.bucket.create('new-bucket', { public: false });
const { data: buckets } = await client.storage.bucket.list();
```

### 5. Auth Authentication

```typescript
// User registration
const { data: session } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: { data: { name: 'User Name' } },
});

// Login
const { data: session } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password',
});

// OAuth login
const { data: session } = await client.auth.signInWithOAuth('google');

// Get current user
const user = client.auth.getUser();

// Update user information
const { data: updatedUser } = await client.auth.updateUser({
  user_metadata: { theme: 'dark' },
});

// Logout
await client.auth.signOut();

// Auth state monitoring
const unsubscribe = client.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
});
```

## 🔧 Schema & Model Definition (Legacy API)

### Schema Definition

```typescript
import { defineSchema, FieldType } from 'gftd-orm';

export const UserSchema = defineSchema('User', {
  id:       FieldType.UUID.primaryKey(),
  tenantId: FieldType.UUID.notNull(),
  name:     FieldType.STRING.notNull(),
  email:    FieldType.STRING.notNull(),
  created:  FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
});
```

### Model Definition

```typescript
import { defineModel, StreamType } from 'gftd-orm';

export const User = defineModel({
  schema: UserSchema,
  type:   StreamType.TABLE,
  topic:  'users',
  key:    'id',
});
```

### RLS Policy Definition

```typescript
import { definePolicy } from 'gftd-orm';

definePolicy(UserSchema.name, (ctx) => {
  return `tenantId = '${ctx.tenantId}'`;
});
```

## 📋 Available Commands

```bash
# Install dependencies
pnpm install

# Development (watch mode)
pnpm dev

# Build
pnpm build

# Run tests
pnpm test                  # Fast test execution with Vitest
pnpm test:watch           # Test execution in watch mode
pnpm test:coverage        # Test execution with coverage
pnpm test:ui              # Test execution with Vitest UI
pnpm test:benchmark       # Benchmark test execution

# Run demos
pnpm demo                 # Mock demo
pnpm demo:real            # Real service connection demo
pnpm demo:gftd            # New integrated demo
pnpm demo:mv              # Materialized View demo

# Code quality
pnpm lint                 # Code check with ESLint
pnpm format               # Code formatting with Prettier
```

## 🎯 Implementation Examples

See the detailed implementation examples:

- [examples/gftd-orm-demo.ts](examples/gftd-orm-demo.ts) - Integrated demo (all features)
- [examples/mock-demo.ts](examples/mock-demo.ts) - Mock demo
- [examples/demo.ts](examples/demo.ts) - Legacy API

## 📚 Documentation

- [**SECURITY.md**](SECURITY.md) - Comprehensive security guide
- [**env.example**](env.example) - Environment variable configuration example

## 🏥 Health Check

```typescript
const health = await client.health();
console.log(health);
// {
//   database: { status: 'ok', details: {...} },
//   realtime: { status: 'ok', details: {...} },
//   storage: { status: 'ok' },
//   auth: { status: 'ok' }
// }
```

## 🔧 Configuration Options

### Database Configuration

```typescript
database: {
  ksql: {
    url: 'http://localhost:8088',
    apiKey?: 'your-api-key',
    apiSecret?: 'your-api-secret',
    headers?: { 'Custom-Header': 'value' },
  },
  schemaRegistry: {
    url: 'http://localhost:8081',
    auth?: { user: 'admin', pass: 'admin' },
    apiKey?: 'schema-registry-key',
  },
}
```

### Realtime Configuration

```typescript
realtime: {
  url: 'ws://localhost:8088',
  apiKey?: 'your-api-key',
  autoReconnect?: true,
  reconnectInterval?: 5000,
  maxReconnectAttempts?: 10,
}
```

### Storage Configuration

```typescript
storage: {
  bucketName: 'my-bucket',
  region?: 'us-east-1',
  endpoint?: 'http://localhost:9000',
  accessKeyId?: 'access-key',
  secretAccessKey?: 'secret-key',
  publicUrl?: 'https://cdn.example.com',
}
```

### Auth Configuration

```typescript
auth: {
  jwtSecret: 'your-jwt-secret',
  jwtExpiresIn?: '1h',
  allowAnonymous?: false,
  providers?: {
    google: {
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
    },
    github: {
      clientId: 'github-client-id',
      clientSecret: 'github-client-secret',
    },
    email: {
      enabled: true,
      requireConfirmation?: false,
    },
  },
}
```

## 🔧 Development & CI/CD

### Testing Environment
- **Vitest**: Fast and lightweight test runner
- **Coverage**: Detailed coverage reports with v8 provider
- **UI Testing**: Browser-based test UI
- **Benchmarks**: Automatic performance test execution

### CI/CD Pipeline
- **Automated Testing**: Matrix testing on Node.js 18.x, 20.x
- **Security Scanning**: CodeQL, dependency audit, secret scanning
- **Performance Monitoring**: Weekly benchmarks, memory leak tests
- **Automated Deployment**: Automatic publishing to GitHub Packages
- **Dependency Updates**: Weekly updates with Dependabot

### Quality Assurance
- **Type Safety**: TypeScript strict mode
- **Code Style**: ESLint + Prettier
- **Security**: SQL injection prevention, input validation
- **Monitoring**: Performance monitoring with alerts

See [DEVELOPMENT.md](DEVELOPMENT.md) for details.

## 🚧 Roadmap

### ✅ Completed
- [x] **Security Enhancement** - Comprehensive enterprise security features
- [x] **Audit Log System** - Detailed recording of security events
- [x] **Rate Limiting** - DDoS attack prevention and access control
- [x] **Encryption Features** - Password hashing and JWT signature verification

### 🔄 In Development
- [ ] GraphQL API support
- [ ] Edge Functions support
- [ ] Analytics & Monitoring
- [ ] CLI tools

### 📋 Planned
- [ ] React/Vue.js hooks
- [ ] Docker Compose setup
- [ ] AWS/GCP deployment guide
- [ ] Performance optimization
- [ ] Internationalization (i18n)

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

With GFTD ORM, you can build **Kafka-based real-time data platforms** with a **Supabase-like developer experience**. 🚀