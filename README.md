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

### 🛡️ Security
- **包括的なセキュリティ** - エンタープライズグレードのセキュリティ機能
- **SQLインジェクション対策** - パラメータ化クエリとエスケープ処理
- **レート制限・DDoS対策** - 多層的なアクセス制御
- **監査ログ** - 全アクティビティの詳細記録
- **暗号化・ハッシュ化** - bcryptによるパスワード保護
- **CSRF/XSS対策** - クロスサイト攻撃の防止

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

## 🔥 Next.js 完全対応

GFTD-ORMは **Next.js App Router** の **サーバーサイド** と **クライアントサイド** の両方で使用できるように設計されています。

### 環境別インポート

```typescript
// サーバーサイド用（Server Components, API Routes, Server Actions）
import { createClient } from '@gftdcojp/gftd-orm/server';

// クライアントサイド用（Client Components）
import { createClient } from '@gftdcojp/gftd-orm/client';

// 汎用（環境自動判定）
import { createClient } from '@gftdcojp/gftd-orm';
```

### Server Component での使用

```typescript
// app/page.tsx
import { createClient } from '@gftdcojp/gftd-orm/client';

const client = createClient({
  url: process.env.GFTD_URL!,
  database: {
    ksql: {
      url: process.env.KSQLDB_URL!,
      apiKey: process.env.KSQLDB_API_KEY,
      apiSecret: process.env.KSQLDB_API_SECRET,
    },
    schemaRegistry: {
      url: process.env.SCHEMA_REGISTRY_URL!,
    },
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
      <h1>ユーザー一覧</h1>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Client Component でのリアルタイム

```typescript
// app/realtime-dashboard.tsx
'use client';

import { useGftdOrm, useRealtimeSubscription } from '@gftdcojp/gftd-orm/hooks/useGftdOrm';

export default function RealtimeDashboard() {
  const { client, isConnected } = useGftdOrm({
    url: process.env.NEXT_PUBLIC_GFTD_URL!,
    database: {
      ksql: {
        url: process.env.NEXT_PUBLIC_KSQLDB_URL!,
        apiKey: process.env.NEXT_PUBLIC_KSQLDB_API_KEY,
        apiSecret: process.env.NEXT_PUBLIC_KSQLDB_API_SECRET,
      },
      schemaRegistry: {
        url: process.env.NEXT_PUBLIC_SCHEMA_REGISTRY_URL!,
      },
    },
    realtime: {
      url: process.env.NEXT_PUBLIC_REALTIME_URL!,
    },
  });

  useRealtimeSubscription(client, 'updates', 'users', 'INSERT', (payload) => {
    console.log('新しいユーザー:', payload);
  });

  return (
    <div>
      <p>接続状態: {isConnected ? '接続済み' : '未接続'}</p>
    </div>
  );
}
```

### API Routes での使用

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@gftdcojp/gftd-orm/client';

export async function GET() {
  const client = createClient({
    url: process.env.GFTD_URL!,
    database: {
      ksql: { url: process.env.KSQLDB_URL! },
      schemaRegistry: { url: process.env.SCHEMA_REGISTRY_URL! },
    },
  });

  await client.initialize();
  const { data } = await client.from('users').select('*').execute();
  
  return NextResponse.json({ data });
}
```

### React Hooks

```typescript
import { useGftdOrmQuery, useGftdOrmMutation } from '@gftdcojp/gftd-orm/hooks/useGftdOrm';

function UserList({ client }) {
  // データフェッチ
  const { data: users, loading, error, refetch } = useGftdOrmQuery(
    client,
    'users',
    (query) => query.select('*').eq('status', 'active')
  );

  // データミューテーション
  const { insert, update, remove } = useGftdOrmMutation(client, 'users');

  const handleCreate = async (userData) => {
    await insert(userData);
    refetch(); // データ再取得
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### 環境変数設定

```bash
# .env.local (Next.js プロジェクト)

# サーバーサイド用
GFTD_URL=http://localhost:8088
KSQLDB_URL=http://localhost:8088
KSQLDB_API_KEY=your-api-key
KSQLDB_API_SECRET=your-api-secret
SCHEMA_REGISTRY_URL=http://localhost:8081
REALTIME_URL=ws://localhost:8088

# クライアントサイド用（NEXT_PUBLIC_ プレフィックス必須）
NEXT_PUBLIC_GFTD_URL=http://localhost:8088
NEXT_PUBLIC_KSQLDB_URL=http://localhost:8088
NEXT_PUBLIC_KSQLDB_API_KEY=your-api-key
NEXT_PUBLIC_KSQLDB_API_SECRET=your-api-secret
NEXT_PUBLIC_SCHEMA_REGISTRY_URL=http://localhost:8081
NEXT_PUBLIC_REALTIME_URL=ws://localhost:8088
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
pnpm test                  # Vitest による高速テスト実行
pnpm test:watch           # ウォッチモードでテスト実行
pnpm test:coverage        # カバレッジ付きテスト実行
pnpm test:ui              # Vitest UI でテスト実行
pnpm test:benchmark       # ベンチマークテスト実行

# デモ実行
pnpm demo                 # モックデモ
pnpm demo:real            # 実際のサービス接続デモ
pnpm demo:gftd            # 新しい統合デモ
pnpm demo:mv              # Materialized View デモ

# コード品質
pnpm lint                 # ESLint でコードチェック
pnpm format               # Prettier でコードフォーマット
```

## 🎯 実装例

詳細な実装例は以下を参照してください：

- [examples/gftd-orm-demo.ts](examples/gftd-orm-demo.ts) - 統合デモ（全機能）
- [examples/mock-demo.ts](examples/mock-demo.ts) - モックデモ
- [examples/demo.ts](examples/demo.ts) - 従来のAPI

## 📚 ドキュメント

- [**SECURITY.md**](SECURITY.md) - 包括的なセキュリティガイド
- [**env.example**](env.example) - 環境変数設定例

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

## 🔧 開発・CI/CD

### テスト環境
- **Vitest**: 高速で軽量なテストランナー
- **カバレッジ**: v8 プロバイダーによる詳細なカバレッジレポート
- **UI テスト**: ブラウザベースのテストUI
- **ベンチマーク**: パフォーマンステストの自動実行

### CI/CD パイプライン
- **自動テスト**: Node.js 18.x, 20.x でのマトリックステスト
- **セキュリティスキャン**: CodeQL、依存関係監査、シークレットスキャン
- **パフォーマンス監視**: 週次ベンチマーク、メモリリークテスト
- **自動デプロイ**: GitHub Packages への自動発行
- **依存関係更新**: Dependabot による週次更新

### 品質保証
- **型安全性**: TypeScript strict mode
- **コードスタイル**: ESLint + Prettier
- **セキュリティ**: SQLインジェクション対策、入力バリデーション
- **監視**: アラート付きパフォーマンス監視

詳細は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。

## 🚧 Roadmap

### ✅ 完了済み
- [x] **セキュリティ強化** - 包括的なエンタープライズセキュリティ機能
- [x] **監査ログシステム** - セキュリティイベントの詳細記録
- [x] **レート制限機能** - DDoS攻撃対策とアクセス制御
- [x] **暗号化機能** - パスワードハッシュ化とJWT署名検証

### 🔄 開発中
- [ ] GraphQL API 対応
- [ ] Edge Functions 対応
- [ ] Analytics & Monitoring
- [ ] CLI ツール

### 📋 計画中
- [ ] React/Vue.js フック
- [ ] Docker Compose セットアップ
- [ ] AWS/GCP デプロイガイド
- [ ] パフォーマンス最適化
- [ ] 国際化対応 (i18n)

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストやイシューを歓迎します。

---

GFTD ORM により、**Supabase ライクな開発体験**で **Kafka ベースのリアルタイムデータプラットフォーム**を構築できます。🚀