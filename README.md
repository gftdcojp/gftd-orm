# GFTD ORM

Enterprise-grade real-time data platform with ksqlDB, inspired by Supabase architecture

🚀 **Database, Realtime, Storage, Auth** の統合プラットフォーム

Confluent Schema Registry + ksqlDB を土台に、**Supabase ライクな統合 API** で Database（型安全な ORM）、Realtime（WebSocket）、Storage（S3 互換）、Auth（JWT 認証）を提供するエンタープライズ向けリアルタイムデータプラットフォームです。

## 🎯 特徴

### 🔷 Database
- **TypeScript 完全対応** - Drizzle ORM ライクな型安全な DSL
- **ksqlDB 統合** - Stream/Table マッピングとリアルタイム処理  
- **Row-Level Security** - ポリシーベースの行レベルセキュリティ
- **Schema Registry** - Avro/JSON Schema 自動管理

### ⚡ Realtime
- **WebSocket 通信** - リアルタイムデータ更新
- **テーブル監視** - INSERT/UPDATE/DELETE イベント
- **ストリーム監視** - Kafka ストリームイベント
- **プレゼンス機能** - ユーザーのオンライン状態管理
- **ブロードキャスト** - リアルタイム通信

### 🗄️ Storage
- **S3 互換** - MinIO/AWS S3 対応
- **ファイル管理** - アップロード/ダウンロード/削除
- **署名付きURL** - セキュアなファイルアクセス
- **バケット管理** - 複数ストレージ管理

### 🔐 Auth
- **JWT 認証** - セキュアなトークンベース認証
- **OAuth 対応** - Google, GitHub 等のプロバイダー
- **ユーザー管理** - 登録/ログイン/パスワード管理
- **セッション管理** - 自動リフレッシュ対応

## 🏗️ アーキテクチャ

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

## 📦 インストール

```bash
npm install @gftdcojp/gftd-orm
# または
yarn add @gftdcojp/gftd-orm
# または
pnpm add @gftdcojp/gftd-orm
```

## 🚀 クイックスタート

### 1. クライアント作成と初期化

```typescript
import { createClient } from '@gftdcojp/gftd-orm';

const client = createClient({
  url: 'http://localhost:8088',
  key: 'your-api-key',
  
  // Database設定（必須）
  database: {
    ksql: {
      url: 'http://localhost:8088',
      apiKey: 'your-api-key',
      apiSecret: 'your-api-secret',
    },
    schemaRegistry: {
      url: 'http://localhost:8081',
      auth: { user: 'admin', pass: 'admin' },
    },
  },
  
  // Realtime設定（オプション）
  realtime: {
    url: 'ws://localhost:8088',
    autoReconnect: true,
  },
  
  // Storage設定（オプション）
  storage: {
    bucketName: 'my-bucket',
    endpoint: 'http://localhost:9000',
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  
  // Auth設定（オプション）
  auth: {
    jwtSecret: 'your-jwt-secret',
  },
});

// 初期化
await client.initialize();
```

### 2. Database 操作（Supabaseライク）

```typescript
// データ取得
const { data, error } = await client
  .from('users')
  .select('*')
  .eq('status', 'active')
  .order('created', false)
  .limit(10)
  .execute();

// データ挿入
const { data: newUser } = await client
  .from('users')
  .insert({
    name: '田中太郎',
    email: 'tanaka@example.com',
    status: 'active',
  });

// データ更新
const { data: updatedUser } = await client
  .from('users')
  .eq('id', 'user-123')
  .update({ status: 'premium' });

// データ削除
const { data } = await client
  .from('users')
  .eq('id', 'user-123')
  .delete();

// SQL直接実行
const result = await client.sql('SELECT COUNT(*) FROM users_table');
```

### 3. Realtime 監視

```typescript
// チャンネル作成
const channel = client.channel('user-changes');

// テーブル変更監視
channel.onTable('users', 'INSERT', (payload) => {
  console.log('新しいユーザー:', payload);
});

channel.onTable('users', 'UPDATE', (payload) => {
  console.log('ユーザー更新:', payload);
});

// ストリーム監視
channel.onStream('messages', (payload) => {
  console.log('新しいメッセージ:', payload);
});

// ブロードキャスト
channel.onBroadcast('notifications', (payload) => {
  console.log('通知:', payload);
});

// プレゼンス機能
channel.presence.track({ status: 'online' });
channel.presence.onChange((payload) => {
  console.log('プレゼンス変更:', payload);
});

// 接続開始
await channel.connect();

// メッセージ送信
await channel.broadcast('notifications', {
  type: 'user_joined',
  user: 'tanaka@example.com',
});
```

### 4. Storage 操作

```typescript
// ファイルアップロード
const { data: file } = await client.storage.upload(
  'avatars/user.jpg',
  fileBuffer,
  { contentType: 'image/jpeg' }
);

// ファイルダウンロード
const { data: fileData } = await client.storage.download('avatars/user.jpg');

// ファイル一覧
const { data: files } = await client.storage.list('avatars/');

// 署名付きURL生成
const { data: signedUrl } = client.storage.createSignedUrl('avatars/user.jpg', 3600);

// 公開URL取得
const { data: publicUrl } = client.storage.getPublicUrl('avatars/user.jpg');

// バケット管理
await client.storage.bucket.create('new-bucket', { public: false });
const { data: buckets } = await client.storage.bucket.list();
```

### 5. Auth 認証

```typescript
// ユーザー登録
const { data: session } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: { data: { name: 'User Name' } },
});

// ログイン
const { data: session } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password',
});

// OAuth ログイン
const { data: session } = await client.auth.signInWithOAuth('google');

// 現在のユーザー取得
const user = client.auth.getUser();

// ユーザー情報更新
const { data: updatedUser } = await client.auth.updateUser({
  user_metadata: { theme: 'dark' },
});

// ログアウト
await client.auth.signOut();

// 認証状態監視
const unsubscribe = client.auth.onAuthStateChange((event, session) => {
  console.log('認証状態変更:', event, session);
});
```

## 🔧 スキーマ＆モデル定義（従来のAPI）

### スキーマ定義

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

### モデル定義

```typescript
import { defineModel, StreamType } from 'gftd-orm';

export const User = defineModel({
  schema: UserSchema,
  type:   StreamType.TABLE,
  topic:  'users',
  key:    'id',
});
```

### RLS ポリシー定義

```typescript
import { definePolicy } from 'gftd-orm';

definePolicy(UserSchema.name, (ctx) => {
  return `tenantId = '${ctx.tenantId}'`;
});
```

## 📋 利用可能なコマンド

```bash
# 依存関係のインストール
pnpm install

# 開発（ウォッチモード）
pnpm dev

# ビルド
pnpm build

# テスト実行
pnpm test

# デモ実行（モック）
pnpm demo

# デモ実行（実際のサービス接続）
pnpm demo:real

# 新しい統合デモ実行
pnpm demo:gftd

# リント
pnpm lint

# フォーマット
pnpm format
```

## 🎯 実装例

詳細な実装例は以下を参照してください：

- [examples/gftd-orm-demo.ts](examples/gftd-orm-demo.ts) - 統合デモ（全機能）
- [examples/mock-demo.ts](examples/mock-demo.ts) - モックデモ
- [examples/demo.ts](examples/demo.ts) - 従来のAPI

## 🏥 ヘルスチェック

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

## 🔧 設定オプション

### Database設定

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

### Realtime設定

```typescript
realtime: {
  url: 'ws://localhost:8088',
  apiKey?: 'your-api-key',
  autoReconnect?: true,
  reconnectInterval?: 5000,
  maxReconnectAttempts?: 10,
}
```

### Storage設定

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

### Auth設定

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

## 🚧 Roadmap

- [ ] GraphQL API 対応
- [ ] Edge Functions 対応
- [ ] Analytics & Monitoring
- [ ] CLI ツール
- [ ] React/Vue.js フック
- [ ] Docker Compose セットアップ
- [ ] AWS/GCP デプロイガイド

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストやイシューを歓迎します。

---

GFTD ORM により、**Supabase ライクな開発体験**で **Kafka ベースのリアルタイムデータプラットフォーム**を構築できます。🚀