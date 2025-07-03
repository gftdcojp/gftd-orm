/**
 * ksqlDB ORM デモ - 設計案の実装例
 */

import {
  init,
  defineSchema,
  defineModel,
  definePolicy,
  FieldType,
  StreamType,
  setExecutionContext,
  createContextFromUserId,
} from '../src/index';

// 設計案のスキーマ定義例
export const UserSchema = defineSchema('User', {
  id:       FieldType.UUID.primaryKey(),
  tenantId: FieldType.UUID.notNull(),
  name:     FieldType.STRING.notNull(),
  email:    FieldType.STRING.notNull(),
  created:  FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
});

// 設計案のモデル定義例
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

// 設計案のRLS ポリシー登録例
definePolicy(User.definition.schema.name, (ctx) => {
  // ctx = { userId: string, tenantId: string, roles: string[] }
  return `tenantId = '${ctx.tenantId}'`;
});

// より複雑なポリシー例
definePolicy(User.definition.schema.name, (ctx) => {
  // 管理者は全データにアクセス可能
  if (ctx.roles.includes('admin')) {
    return '1=1'; // 常に真
  }
  // 一般ユーザーは自分のテナントのデータのみ
  return `tenantId = '${ctx.tenantId}'`;
});

/**
 * デモ実行関数
 */
export async function runDemo() {
  try {
    console.log('🚀 Starting ksqlDB ORM Demo...\n');

    // 設計案の初期化例
    await init({
      ksql: {
            url: process.env.GFTD_DB_URL || 'https://your-ksqldb-endpoint',
    apiKey: process.env.GFTD_DB_API_KEY,
    apiSecret: process.env.GFTD_DB_API_SECRET,
  },
  schemaRegistry: {
    url: process.env.GFTD_SCHEMA_REGISTRY_URL || 'https://schema-registry',
    auth: {
      user: process.env.GFTD_SCHEMA_REGISTRY_AUTH_USER || 'user',
      pass: process.env.GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD || 'pass' 
        },
      }
    });

    // 実行コンテキストを設定
    const context = createContextFromUserId(
      'user-123',
      'tenant-456',
      ['user']
    );
    setExecutionContext(context);

    console.log('✅ Initialization completed!\n');

    // 設計案のクエリビルダー例
    console.log('📋 Executing queries...\n');

    // RLS 適用前
    const users = await User.findMany({
      where: { name: { like: '%鈴木%' } },
      orderBy: { created: 'desc' },
      limit:  100,
    });

    console.log('Found users:', users.length);

    // 単一ユーザー検索
    const user = await User.findFirst({
      where: { email: 'test@example.com' }
    });

    console.log('Found user:', user ? 'Yes' : 'No');

    // ユーザー数をカウント
    const userCount = await User.count({
      where: { tenantId: 'tenant-456' }
    });

    console.log('User count:', userCount);

    // データの挿入例
    console.log('\n📝 Inserting data...\n');

    const newUser = await User.insert({
      id: '550e8400-e29b-41d4-a716-446655440000',
      tenantId: 'tenant-456',
      name: '田中太郎',
      email: 'tanaka@example.com',
      created: new Date(),
    });

    console.log('Inserted user:', newUser);

    // データの更新例
    console.log('\n📝 Updating data...\n');

    const updatedCount = await User.update(
      { id: '550e8400-e29b-41d4-a716-446655440000' },
      { name: '田中次郎' }
    );

    console.log('Updated records:', updatedCount);

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

/**
 * より高度な使用例
 */
export async function advancedDemo() {
  console.log('🔧 Advanced Demo - Multiple Models\n');

  // 商品スキーマ
  const ProductSchema = defineSchema('Product', {
    id:       FieldType.UUID.primaryKey(),
    tenantId: FieldType.UUID.notNull(),
    name:     FieldType.STRING.notNull(),
    price:    FieldType.DECIMAL(10, 2).notNull(),
    category: FieldType.STRING.notNull(),
    created:  FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
  });

  // 商品モデル
  const Product = defineModel({
    schema: ProductSchema,
    type: StreamType.TABLE,
    topic: 'products',
    key: 'id',
  });

  // 商品の RLS ポリシー
  definePolicy(Product.definition.schema.name, (ctx) => {
    return `tenantId = '${ctx.tenantId}'`;
  });

  // 注文スキーマ
  const OrderSchema = defineSchema('Order', {
    id:         FieldType.UUID.primaryKey(),
    tenantId:   FieldType.UUID.notNull(),
    userId:     FieldType.UUID.notNull(),
    productId:  FieldType.UUID.notNull(),
    quantity:   FieldType.INT.notNull(),
    totalPrice: FieldType.DECIMAL(10, 2).notNull(),
    status:     FieldType.STRING.withDefault('pending'),
    created:    FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
  });

  // 注文モデル（ストリーム）
  const Order = defineModel({
    schema: OrderSchema,
    type: StreamType.STREAM,
    topic: 'orders',
    key: 'id',
  });

  // 注文の RLS ポリシー（ユーザーは自分の注文のみ）
  definePolicy(Order.definition.schema.name, (ctx) => {
    if (ctx.roles.includes('admin')) {
      return `tenantId = '${ctx.tenantId}'`;
    }
    return `tenantId = '${ctx.tenantId}' AND userId = '${ctx.userId}'`;
  });

  console.log('✅ Advanced schemas and models defined');

  // 複雑なクエリの例
  const recentOrders = await Order.findMany({
    where: {
      status: 'completed',
      created: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 過去24時間
    },
    orderBy: { created: 'desc' },
    limit: 50
  });

  console.log('Recent completed orders:', recentOrders.length);

  const products = await Product.findMany({
    where: {
      category: 'electronics',
      price: { lte: 10000 }
    }
  });

  console.log('Affordable electronics:', products.length);
}

/**
 * エラーハンドリングのデモ
 */
export async function errorHandlingDemo() {
  console.log('🚨 Error Handling Demo\n');

  try {
    // 無効なコンテキストでの実行
    setExecutionContext(createContextFromUserId('', '', []));
    
    await User.findMany();
    console.log('⚠️  This should not be reached');
  } catch (error) {
    console.log('✅ Caught expected error for invalid context:', error);
  }

  try {
    // 存在しないフィールドでの検索
    await User.findMany({
      where: { nonExistentField: 'value' } as any
    });
  } catch (error) {
    console.log('✅ Caught expected error for invalid field');
  }
}

// デモを実行（直接実行された場合）
if (require.main === module) {
  runDemo()
    .then(() => advancedDemo())
    .then(() => errorHandlingDemo())
    .catch(console.error);
} 