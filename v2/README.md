# ksqlDB ORM

Kafka プラットフォーム（Confluent）をベースに、TypeScript で Drizzle ORM ライクな型安全な DSL を実装したストリーム処理 ORM です。ksqlDB をストリーム処理層に採用し、RLS（Row-Level Security）はモデルごとにポリシーを定義し、クエリ生成時に自動的にフィルタを注入することで実現します。

## 特徴

- 🔷 **TypeScript 完全対応** - Drizzle ORM ライクな型安全な DSL
- 🚀 **ksqlDB 統合** - Stream/Table マッピングとリアルタイム処理
- 🔒 **Row-Level Security** - ポリシーベースの行レベルセキュリティ
- 📊 **Schema Registry** - Avro/JSON Schema 自動管理
- ⚡ **リアルタイム** - Pull/Push Query 対応
- 🏢 **エンタープライズ対応** - マルチテナント・認可機能

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐
│ TypeScript ORM  │    │ Schema Registry │
│ (Drizzle-like)  │◄──►│ (Avro/JSON)     │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ ksqlDB          │    │ Kafka Topics    │
│ (Stream/Table)  │◄──►│ (Events)        │
└─────────────────┘    └─────────────────┘
```

## インストール

```bash
npm install ksqldb-orm
# または
yarn add ksqldb-orm
# または
pnpm add ksqldb-orm
```

## クイックスタート

### 1. スキーマ定義

```typescript
import { defineSchema, FieldType } from 'ksqldb-orm';

export const UserSchema = defineSchema('User', {
  id:       FieldType.UUID.primaryKey(),
  tenantId: FieldType.UUID.notNull(),
  name:     FieldType.STRING.notNull(),
  email:    FieldType.STRING.notNull(),
  created:  FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
});
```

### 2. モデル定義

```typescript
import { defineModel, StreamType } from 'ksqldb-orm';
import { UserSchema } from './schemas';

export const User = defineModel({
  schema: UserSchema,
  type:   StreamType.TABLE,      // STREAM or TABLE
  topic:  'users',               // Kafka トピック名
  key:    'id',
  sqlOptions: {
    // 永続クエリで TABLE を作成
    as: `CREATE TABLE users_table WITH (KAFKA_TOPIC='users', VALUE_FORMAT='AVRO') AS
         SELECT * FROM users_stream;`
  }
});
```

### 3. RLS ポリシー定義

```typescript
import { definePolicy } from 'ksqldb-orm';

definePolicy(User.definition.schema.name, (ctx) => {
  // ctx = { userId: string, tenantId: string, roles: string[] }
  return `tenantId = '${ctx.tenantId}'`;
});
```

### 4. 初期化

```typescript
import { init } from 'ksqldb-orm';

await init({
  ksql: {
    url: 'https://your-ksqldb-endpoint',
    apiKey: 'your-api-key',
    apiSecret: 'your-api-secret',
  },
  schemaRegistry: {
    url: 'https://schema-registry-endpoint',
    auth: { user: 'user', pass: 'pass' },
  }
});
```

### 5. クエリ実行

```typescript
import { setExecutionContext, createContextFromUserId } from 'ksqldb-orm';

// 実行コンテキストを設定
setExecutionContext(createContextFromUserId('user-123', 'tenant-456', ['user']));

// RLS が自動適用されたクエリ
const users = await User.findMany({
  where: { name: { like: '%鈴木%' } },
  orderBy: { created: 'desc' },
  limit: 100,
});

// 実行される Pull Query（例）
// SELECT * FROM users_table
// WHERE name LIKE '%鈴木%' AND tenantId = 'tenant-456'
// ORDER BY created DESC
// LIMIT 100;
```

## API リファレンス

### FieldType

利用可能なフィールド型：

```typescript
FieldType.STRING        // VARCHAR
FieldType.INT           // INTEGER
FieldType.LONG          // BIGINT
FieldType.DOUBLE        // DOUBLE
FieldType.BOOLEAN       // BOOLEAN
FieldType.UUID          // VARCHAR (UUID)
FieldType.TIMESTAMP     // TIMESTAMP
FieldType.DATE          // DATE
FieldType.TIME          // TIME
FieldType.DECIMAL(p, s) // DECIMAL(precision, scale)
```

### フィールド修飾子

```typescript
FieldType.STRING.notNull()                    // NOT NULL
FieldType.UUID.primaryKey()                   // PRIMARY KEY
FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP')  // DEFAULT
```

### クエリメソッド

```typescript
// 検索
const users = await User.findMany(options);
const user = await User.findFirst(options);
const user = await User.findById(id);

// 集計
const count = await User.count(where);

// 更新
const newUser = await User.insert(data);
const updatedCount = await User.update(where, data);
const deletedCount = await User.delete(where);
```

## 開発・ビルド

```bash
# 依存関係のインストール
pnpm install

# 開発（ウォッチモード）
pnpm dev

# ビルド
pnpm build

# テスト
pnpm test

# リント
pnpm lint
```

## 実装例

詳細な実装例は [examples/demo.ts](examples/demo.ts) を参照してください。

## ライセンス

MIT License

## 貢献

プルリクエストやイシューを歓迎します。

---

これにより、Kafka トピックをリレーショナル DB ライクに扱いながらも、エンタープライズ要件（型安全性・RLS・スケーラビリティ）を満たす ORM 層を TypeScript で構築できます。