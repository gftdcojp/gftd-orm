# GFTD ORM

Enterprise-grade real-time data platform with ksqlDB foundation

🚀 **Real-time data platform for ksqlDB and Kafka**

An enterprise-grade real-time data platform that provides TypeScript-first integration with ksqlDB, Confluent Schema Registry, and Kafka streams.

## 🎯 実装状況

### ✅ 完成済み機能（完成度: 95%以上）

#### 📊 コア機能
- **TypeScript型システム**: フィールド型定義、スキーマ定義
- **ksqlDBクライアント**: 完全実装（DDL、DML、プルクエリ、プッシュクエリ）
- **Schema Registry**: 完全実装（スキーマ登録、取得、互換性チェック）
- **配列→オブジェクト変換**: ksqlDBレスポンスの自動変換機能
- **TypeScript型生成**: ksqlDBスキーマから自動型定義生成
- **CLIコマンド**: 完全実装（型生成、テーブル一覧、ドライラン等）

#### 🛡️ セキュリティ機能
- **JWT認証**: 完全実装（トークン生成、検証、リフレッシュ）
- **Auth0統合**: 完全実装（デフォルト設定、カスタム設定対応）
- **匿名キーシステム**: 完全実装（Supabase風認証）
- **行レベルセキュリティ(RLS)**: 完全実装（ポリシー管理、権限制御）
- **監査ログ**: 包括的なログ機能
- **レート制限**: 多層的なレート制限機能

#### ⚡ リアルタイム機能
- **Realtime機能**: WebSocketベースのリアルタイム通信
- **Reactフック**: 完全実装（useGftdOrm、useBrowserClient等）
- **統合クライアント**: 各コンポーネントの統合レイヤー

#### 🛠️ 開発者体験
- **高レベルAPI**: `createClient`、`defineSchema`、`init`、`healthCheck`等の統合API
- **包括的テスト**: 完全実装（型生成、ベンチマーク、スキーマ等）
- **TypeScript完全対応**: 型安全な開発環境

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

### 1. ✅ オブジェクト形式レスポンス（完成機能）

```typescript
import { executePullQuery, PullQueryOptions } from '@gftdcojp/gftd-orm';

// デフォルト: オブジェクト形式で返される
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

// 従来通り配列形式で取得したい場合
const options: PullQueryOptions = { format: 'array' };
const arrayResult = await executePullQuery('SELECT * FROM users_table LIMIT 10;', options);
console.log(arrayResult.data);
// [
//   ["user-123", "John Doe", "john@example.com", "2024-01-01T00:00:00.000Z"]
// ]
```

### 2. ✅ TypeScript型生成（完成機能）

#### CLIコマンドで型生成

```bash
# 単一テーブルの型生成
npx gftd-orm generate-types --table OSHIETE_SOURCES_TABLE --output ./types

# 全テーブルの型生成
npx gftd-orm generate-all --output ./types

# テーブル一覧を表示
npx gftd-orm list

# 環境変数で設定
export GFTD_DB_URL="http://localhost:8088"
export GFTD_DB_API_KEY="your-api-key" 
export GFTD_DB_API_SECRET="your-secret"

# またはオプションで指定
npx gftd-orm generate-types \
  --table USERS_TABLE \
  --url http://localhost:8088 \
  --api-key your-key \
  --api-secret your-secret \
  --output ./types
```

#### 生成される型定義例

```typescript
// types/oshiete_sources.ts - 自動生成されるファイル

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

#### 生成された型の使用

```typescript
import { executePullQuery } from '@gftdcojp/gftd-orm';
import { OshieteSourcesTable, mapOshieteSourcesTableRow } from './types/oshiete_sources';

// 型安全なクエリ実行
const result = await executePullQuery('SELECT * FROM OSHIETE_SOURCES_TABLE LIMIT 10;');

// 自動でオブジェクト形式に変換済み（v25.07.8）
const sources: OshieteSourcesTable[] = result.data;

// または配列形式の場合は手動でマッピング
const arrayResult = await executePullQuery('SELECT * FROM OSHIETE_SOURCES_TABLE LIMIT 10;', { format: 'array' });
const mappedSources: OshieteSourcesTable[] = arrayResult.data.map(mapOshieteSourcesTableRow);

// 型安全にアクセス
sources.forEach(source => {
  console.log(`Title: ${source.title}`); // TypeScript型チェック有効
  console.log(`Tags: ${source.tags?.join(', ') || 'No tags'}`); // null安全
});
```

### 3. プログラマティック型生成

```typescript
import { 
  getTableSchema, 
  generateCompleteTypeDefinition,
  listAllTables 
} from '@gftdcojp/gftd-orm';

// 単一テーブルの型生成
const schema = await getTableSchema('USERS_TABLE');
const typeInfo = generateCompleteTypeDefinition(schema);

console.log(typeInfo.fullCode);
// 完全なTypeScript型定義が出力される

// 全テーブルの一覧取得
const tables = await listAllTables();
console.log('Available tables:', tables.map(t => t.name));
```

### 4. ✅ Auth0統合の使用方法（完成機能）

```typescript
import { createAuth0Client, auth0 } from '@gftdcojp/gftd-orm';

// 1. デフォルト設定でAuth0トークンを使用（設定不要）
const auth0Token = "eyJ..."; // Auth0から取得したJWTトークン
const client = createAuth0Client('http://localhost:8088', auth0Token);
// デフォルト: gftd.jp.auth0.com ドメインを使用

// 2. カスタムAuth0設定を使用する場合
const customClient = createAuth0Client('http://localhost:8088', auth0Token, {
  auth0Config: {
    domain: 'your-custom.auth0.com',
    audience: 'https://your-api-identifier',
    clientId: 'your-custom-client-id',
  }
});

// 3. 認証状態の確認
console.log('認証状態:', {
  isAuthenticated: client.auth.isAuthenticated,
  user: client.auth.user,
  error: client.auth.error,
});

// 4. 安全なデータアクセス（RLS自動適用）
const { data, error } = await client.query(`
  SELECT id, name, email, created_at 
  FROM user_profiles 
  WHERE status = 'active'
`);

// 5. 権限・ロールベースのアクセス制御
if (client.hasPermission('read:sensitive_data')) {
  const { data } = await client.query('SELECT * FROM sensitive_table');
}

if (client.hasRole('admin')) {
  // 管理者のみアクセス可能な操作
}

// 6. リアルタイムストリーミング
const subscription = await client.stream(
  'SELECT * FROM user_activity EMIT CHANGES',
  (update) => console.log('リアルタイム更新:', update)
);

// 7. Express.jsでのミドルウェア使用
import { createAuth0Middleware } from '@gftdcojp/gftd-orm';

// デフォルト設定でミドルウェア使用
app.use('/api/protected', createAuth0Middleware({
  requiredPermissions: ['read:data'],
  requiredRoles: ['user'],
}));

// カスタムAuth0設定でミドルウェア使用
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

### 5. ✅ Supabase風認証システムの使用方法（匿名キー）

```typescript
import { createClient, getKeys, rls } from '@gftdcojp/gftd-orm';

// 1. 匿名キーを取得（初回起動時に自動生成）
const keys = getKeys();
console.log('公開可能な匿名キー:', keys.anonKey);
console.log('サーバー専用キー:', keys.serviceRoleKey); // 絶対に公開しない

// 2. クライアント作成（フロントエンド）
const client = createClient('http://localhost:8088', keys.anonKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});

// 3. 安全なデータアクセス（RLS自動適用）
const { data, error } = await client.query(`
  SELECT id, name, email, created_at 
  FROM user_profiles 
  WHERE status = 'active'
`);

if (error) {
  console.error('アクセス拒否:', error);
} else {
  console.log('取得データ:', data);
}

// 4. リアルタイムストリーミング
const subscription = await client.stream(
  'SELECT * FROM user_activity EMIT CHANGES',
  (update) => {
    console.log('リアルタイム更新:', update);
  }
);

// 5. RLSポリシーの設定（管理者のみ）
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

// 6. 認証状態の確認
console.log('認証情報:', {
  isAuthenticated: client.auth.isAuthenticated,
  isAnonymous: client.auth.isAnonymous,
  user: client.auth.user,
});
```

### 6. 基本的な使用方法（従来機能）

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

// ksqlDBクライアントの初期化
initializeKsqlDbClient({
  url: 'http://localhost:8088',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
});

// クエリの実行（自動でオブジェクト形式）
const result = await executePullQuery('SELECT * FROM users_table LIMIT 10;');
console.log(result.data); // オブジェクトの配列

// Schema Registryの初期化
initializeSchemaRegistryClient({
  url: 'http://localhost:8081',
  auth: { user: 'admin', pass: 'admin' }
});

// スキーマの登録
await registerSchema('user-value', {
  type: 'record',
  name: 'User',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' }
  ]
});

// リアルタイム機能
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

# Auth0 Integration (デフォルト値設定済み - 必要な場合のみ上書き)
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

### 🔐 Auth0設定について

**デフォルト設定**:
- `AUTH0_DOMAIN`: `gftd.jp.auth0.com` （設定済み）
- `AUTH0_CLIENT_ID`: `k0ziPQ6IkDxE1AUSvzx5PwXtnf4y81x0` （設定済み）

環境変数での設定は**オプション**です。異なるAuth0テナントを使用する場合のみ設定してください。

**プログラムでの設定**:
```typescript
// デフォルト設定使用（推奨）
const client = createAuth0Client(ksqlDbUrl, auth0Token);

// カスタム設定使用
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
npx gftd-orm list                           # テーブル一覧表示
npx gftd-orm generate-types --table <name>  # 単一テーブル型生成
npx gftd-orm generate-all                   # 全テーブル型生成

# Development CLI (for contributors)
pnpm cli:list                              # テーブル一覧表示
pnpm cli:generate --table <name>          # 単一テーブル型生成
pnpm cli:generate-all                     # 全テーブル型生成
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

## ✅ v25.07.8 完成機能詳細

### 1. 🔐 Auth0統合システム（完成機能）

**実装内容**:
- **Auth0 JWT検証**: JWKS（JSON Web Key Set）を使った安全なトークン検証
- **自動ユーザーマッピング**: Auth0クレームをGFTD ORMユーザーペイロードに変換
- **権限・ロール連携**: Auth0のカスタムクレームによる細かいアクセス制御
- **RLS自動適用**: Auth0ユーザー情報に基づくRow Level Security

**使用例**:
```typescript
import { createAuth0Client } from '@gftdcojp/gftd-orm';

// Auth0トークンで認証（既存のAuth0システムと完全統合）
const client = createAuth0Client('http://localhost:8088', auth0Token);

// 権限に基づく安全なデータアクセス
if (client.hasPermission('read:data')) {
  const { data } = await client.query('SELECT * FROM users');
}
```

### 2. 🔐 Supabase風認証システム（完成機能）

**実装内容**:
- **JWT認証システム**: トークン生成・検証・リフレッシュ機能
- **匿名キーシステム**: 公開可能な匿名キーとサービスロールキー
- **Row Level Security (RLS)**: ksqlDBクエリの動的フィルタリング
- **統合クライアント**: Supabaseと同様のAPI設計

**使用例**:
```typescript
import { createClient, getKeys } from '@gftdcojp/gftd-orm';

// 匿名キーで安全にアクセス（公開可能）
const keys = getKeys();
const client = createClient('http://localhost:8088', keys.anonKey!);

// RLSが自動適用されたクエリ実行
const { data, error } = await client.query('SELECT * FROM users');
```

### 3. 🛡️ Row Level Security (RLS)

**機能**:
- テーブル単位でのアクセス制御
- ユーザーロール基盤のポリシー管理
- 動的なWHERE句の自動追加
- Supabase互換のポリシー記法

**ポリシー例**:
```typescript
import { rls } from '@gftdcojp/gftd-orm';

// ユーザーが自分のデータのみアクセス可能
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

### 4. 🔑 匿名キーシステム

**特徴**:
- **匿名キー**: フロントエンドで安全に使用可能
- **サービスロールキー**: バックエンド専用の全権限キー
- **自動JWT生成**: キーベースの認証でJWTトークンを自動発行
- **権限管理**: キー毎の細かい権限設定

### 5. 🌐 Confluent Cloud対応

**対応内容**:
- Confluent Cloud ksqlDBとの完全統合
- Schema Registry連携
- SSL/TLS接続サポート
- 企業向けセキュリティ機能

### 6. 既存機能の改善

#### 配列形式レスポンス問題の解決
- `executePullQuery`にformat optionを追加
- デフォルトで`format: 'object'`によりオブジェクト形式で返却
- 後方互換性のため`format: 'array'`オプションも提供

#### TypeScript型生成機能
- ksqlDBスキーマから自動TypeScript型定義生成
- 配列→オブジェクト変換用マッパー関数の自動生成
- カラムメタデータの生成
- CLIコマンドでの一括生成

#### テーブル名重複問題の修正
- 型生成時に`_table`、`_stream`サフィックスを自動除去
- 特殊文字の適切な処理
- より読みやすいインターフェース名の生成

## 📚 Migration Guide

### v25.07.5 → v25.07.8

#### 配列レスポンスを使用していた場合

```typescript
// Before (v25.07.5)
const result = await executePullQuery('SELECT * FROM users;');
const users = result.data.map(row => ({
  id: row[0],
  name: row[1],
  email: row[2]
}));

// After (v25.07.8) - 自動変換
const result = await executePullQuery('SELECT * FROM users;');
const users = result.data; // 既にオブジェクト形式

// 配列形式が必要な場合
const result = await executePullQuery('SELECT * FROM users;', { format: 'array' });
```

#### 型生成の追加

```bash
# 型定義を生成
npx gftd-orm generate-types --table USERS_TABLE --output ./types

# TypeScriptファイルで使用
import { UsersTable } from './types/users';
```

## 📝 License

**Business Source License (No Expiration)** - See the [LICENSE](LICENSE) file for details.

---

With GFTD ORM v25.07.8, you can build **ksqlDB-based real-time data platforms** with **enterprise-grade TypeScript support** and **automatic type generation**. 🚀