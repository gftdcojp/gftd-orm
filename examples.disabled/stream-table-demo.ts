/**
 * ストリームとテーブルの適切な使い分けをテストするデモ
 */

import { 
  init, 
  defineSchema, 
  defineModel, 
  Database,
  createDatabase,
  StreamType,
  OrmConfig,
  FieldType
} from '../src/index';

// 設定例
const config: OrmConfig = {
  ksql: {
    url: 'http://localhost:8088',
    apiKey: process.env.KSQLDB_KEY,
    apiSecret: process.env.KSQLDB_KEY_SECRET,
  },
  schemaRegistry: {
    url: 'http://localhost:8081',
  },
};

// スキーマ定義
const userSchema = defineSchema('user', {
  id: FieldType.STRING.primaryKey(),
  name: FieldType.STRING.notNull(),
  email: FieldType.STRING.notNull(),
  age: FieldType.INT.notNull(),
});

async function main() {
  try {
    console.log('🚀 Starting Stream/Table Demo...');
    
    // 初期化
    await init(config);
    console.log('✅ Initialized ORM');

    // モデル定義（ストリーム）
    const UserModel = defineModel({
      schema: userSchema,
      type: StreamType.STREAM,
      topic: 'users',
      key: 'id',
    });

    console.log('✅ Defined User model');

    // Database APIでのテスト
    const db = createDatabase(config);
    await db.initialize();
    console.log('✅ Initialized Database');

    // データ挿入テスト（ストリームに対して実行される）
    console.log('\n📝 Testing data insertion...');
    
    try {
      const newUser = await UserModel.insert({
        id: 'user-001',
        name: 'テスト太郎',
        email: 'test@example.com',
        age: 30,
      });
      console.log('✅ Insert successful:', newUser);
    } catch (error) {
      console.error('❌ Insert failed:', error);
    }

    // データ取得テスト（テーブルに対してプルクエリを実行される）
    console.log('\n📖 Testing data retrieval...');
    
    try {
      const users = await UserModel.findMany({ limit: 10 });
      console.log(`✅ Found ${users.length} users:`, users);
    } catch (error) {
      console.error('❌ Find failed:', error);
    }

    // Database APIでのテスト
    console.log('\n🔍 Testing Database API...');
    
    try {
      // データ取得（テーブルに対してプルクエリ）
      const result = await db.from('users').select('*').limit(5).execute();
      console.log(`✅ Database API found ${result.data.length} records:`, result.data);
      
      if (result.error) {
        console.error('❌ Database API error:', result.error);
      }
    } catch (error) {
      console.error('❌ Database API failed:', error);
    }

    // 直接SQLテスト
    console.log('\n🔧 Testing direct SQL...');
    
    try {
      // テーブルに対するプルクエリ
      const directResult = await db.sql('SELECT * FROM users_table LIMIT 3;');
      console.log('✅ Direct SQL successful:', directResult);
    } catch (error) {
      console.error('❌ Direct SQL failed:', error);
    }

    console.log('\n🎉 Demo completed!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main }; 