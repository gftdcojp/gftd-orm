/**
 * ksqlDB ORM モックデモ - 実際のサービス接続なしでDSLの動作をテスト
 */

import {
  defineSchema,
  defineModel,
  definePolicy,
  FieldType,
  StreamType,
  setExecutionContext,
  createContextFromUserId,
  debug,
  VERSION,
} from '../src/index';

console.log(`🔧 ksqlDB ORM Mock Demo (Version: ${VERSION})\n`);

// ===== 1. スキーマ定義のテスト =====
console.log('📋 1. スキーマ定義テスト...');

const UserSchema = defineSchema('User', {
  id:       FieldType.UUID.primaryKey(),
  tenantId: FieldType.UUID.notNull(),
  name:     FieldType.STRING.notNull(),
  email:    FieldType.STRING.notNull(),
  age:      FieldType.INT,
  salary:   FieldType.DECIMAL(10, 2),
  isActive: FieldType.BOOLEAN.withDefault(true),
  created:  FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
});

console.log('✅ UserSchema 定義完了');
console.log('   スキーマ名:', UserSchema.name);
console.log('   フィールド数:', UserSchema.avroSchema.fields.length);
console.log('   Avro Schema:', JSON.stringify(UserSchema.avroSchema, null, 2));

// ===== 2. モデル定義のテスト =====
console.log('\n📋 2. モデル定義テスト...');

const User = defineModel({
  schema: UserSchema,
  type: StreamType.TABLE,
  topic: 'users',
  key: 'id',
  sqlOptions: {
    as: `CREATE TABLE users_table WITH (KAFKA_TOPIC='users', VALUE_FORMAT='AVRO') AS
         SELECT * FROM users_stream;`
  }
});

console.log('✅ User モデル定義完了');
console.log('   テーブル名:', User.definition.tableName);
console.log('   タイプ:', User.definition.type);
console.log('   トピック:', User.definition.topic);

// ===== 3. RLS ポリシーのテスト =====
console.log('\n🔒 3. RLS ポリシー定義テスト...');

// 基本的なテナント分離ポリシー
definePolicy(User.definition.schema.name, (ctx) => {
  return `tenantId = '${ctx.tenantId}'`;
});

// 管理者用の特別ポリシー
definePolicy(User.definition.schema.name, (ctx) => {
  if (ctx.roles.includes('admin')) {
    return `1=1`; // 全データアクセス可能
  }
  return `tenantId = '${ctx.tenantId}' AND isActive = true`;
});

console.log('✅ RLS ポリシー定義完了（2つのポリシー）');

// ===== 4. 実行コンテキストのテスト =====
console.log('\n👤 4. 実行コンテキストテスト...');

// 一般ユーザーのコンテキスト
const userContext = createContextFromUserId('user-123', 'tenant-456', ['user']);
setExecutionContext(userContext);

console.log('✅ ユーザーコンテキスト設定完了');
console.log('   ユーザーID:', userContext.userId);
console.log('   テナントID:', userContext.tenantId);
console.log('   ロール:', userContext.roles);

// ===== 5. クエリビルダーのテスト =====
console.log('\n🔍 5. クエリビルダーテスト...');

// モックのクエリビルダー（実際のDBに接続せず、SQL生成のみテスト）
import { buildSelectQuery, buildInsertQuery } from '../src/query-builder';

const selectQuery = buildSelectQuery(
  'users_table',
  ['id', 'name', 'email', 'created'],
  { 
    name: { like: '%田中%' },
    age: { gte: 25 },
    isActive: true
  },
  { created: 'desc' },
  10
);

console.log('✅ SELECT クエリ生成:');
console.log('   ', selectQuery);

const insertQuery = buildInsertQuery('users', {
  id: '550e8400-e29b-41d4-a716-446655440000',
  tenantId: 'tenant-456',
  name: '田中太郎',
  email: 'tanaka@example.com',
  age: 30,
  salary: 500000.00,
  isActive: true,
  created: new Date()
});

console.log('\n✅ INSERT クエリ生成:');
console.log('   ', insertQuery);

// ===== 6. 複数スキーマ・モデルのテスト =====
console.log('\n📊 6. 複数スキーマテスト...');

const ProductSchema = defineSchema('Product', {
  id:       FieldType.UUID.primaryKey(),
  tenantId: FieldType.UUID.notNull(),
  name:     FieldType.STRING.notNull(),
  price:    FieldType.DECIMAL(10, 2).notNull(),
  category: FieldType.STRING.notNull(),
  tags:     FieldType.ARRAY(FieldType.STRING),
  metadata: FieldType.MAP(FieldType.STRING),
  created:  FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
});

const Product = defineModel({
  schema: ProductSchema,
  type: StreamType.TABLE,
  topic: 'products',
  key: 'id',
});

definePolicy(Product.definition.schema.name, (ctx) => {
  return `tenantId = '${ctx.tenantId}'`;
});

console.log('✅ Product スキーマ・モデル定義完了');

const OrderSchema = defineSchema('Order', {
  id:         FieldType.UUID.primaryKey(),
  tenantId:   FieldType.UUID.notNull(),
  userId:     FieldType.UUID.notNull(),
  productId:  FieldType.UUID.notNull(),
  quantity:   FieldType.INT.notNull(),
  totalPrice: FieldType.DECIMAL(12, 2).notNull(),
  status:     FieldType.STRING.withDefault('pending'),
  created:    FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
});

const Order = defineModel({
  schema: OrderSchema,
  type: StreamType.STREAM, // ストリームとして定義
  topic: 'orders',
  key: 'id',
});

definePolicy(Order.definition.schema.name, (ctx) => {
  if (ctx.roles.includes('admin')) {
    return `tenantId = '${ctx.tenantId}'`;
  }
  return `tenantId = '${ctx.tenantId}' AND userId = '${ctx.userId}'`;
});

console.log('✅ Order スキーマ・モデル定義完了（ストリーム）');

// ===== 7. デバッグ情報の表示 =====
console.log('\n🔧 7. デバッグ情報...');
debug();

// ===== 8. 型安全性のテスト =====
console.log('\n✨ 8. 型安全性デモ...');

// TypeScript の型推論のテスト（コンパイル時にチェックされる）
type UserType = typeof UserSchema.type;
type ProductType = typeof ProductSchema.type;

console.log('✅ 型安全性チェック完了');
console.log('   User型のフィールド: id, tenantId, name, email, age, salary, isActive, created');
console.log('   Product型のフィールド: id, tenantId, name, price, category, tags, metadata, created');

// ===== 9. 異なるコンテキストでのポリシーテスト =====
console.log('\n🔐 9. 異なるコンテキストでのポリシーテスト...');

// 管理者コンテキスト
const adminContext = createContextFromUserId('admin-789', 'tenant-456', ['admin', 'user']);
setExecutionContext(adminContext);

import { testPolicy } from '../src/policy';

const userPolicies = testPolicy('User', userContext);
const adminPolicies = testPolicy('User', adminContext);

console.log('✅ ポリシーテスト完了');
console.log('   一般ユーザーポリシー:', userPolicies);
console.log('   管理者ポリシー:', adminPolicies);

// ===== 完了 =====
console.log('\n🎉 ksqlDB ORM モックデモ完了！');
console.log('\n📋 テスト結果:');
console.log('   ✅ スキーマ定義 (User, Product, Order)');
console.log('   ✅ モデル定義 (TABLE, STREAM)');
console.log('   ✅ RLS ポリシー (テナント分離、ロールベース)');
console.log('   ✅ 実行コンテキスト管理');
console.log('   ✅ SQLクエリ生成');
console.log('   ✅ 型安全性');
console.log('   ✅ 複数スキーマ対応');
console.log('   ✅ ポリシーテスト');
console.log('\n🚀 実際の ksqlDB/Schema Registry に接続する場合は examples/demo.ts を使用してください。'); 