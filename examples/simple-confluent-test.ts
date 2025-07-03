/**
 * Confluent Services 基本接続テスト
 */

import { createClient } from '../src/index';

async function simpleConfluentTest() {
  console.log('🧪 Simple Confluent Services Test\n');

  try {
    // 1. GFTD ORM クライアント作成
    console.log('📦 Creating GFTD ORM client...');
    const client = createClient({
      url: 'http://localhost:8088',
      key: 'test-api-key',
      database: {
        ksql: {
          url: 'http://localhost:8088',
          apiKey: 'test-ksql-key',
          apiSecret: 'test-ksql-secret',
        },
        schemaRegistry: {
          url: 'http://localhost:8081',
          auth: {
            user: 'admin',
            pass: 'admin',
          },
        },
      },
      // auth: {
      //   jwtSecret: 'simple-test-jwt-secret-key-minimum-32-characters-long',
      // },
    });

    // 2. 初期化
    console.log('🔄 Initializing client...');
    await client.initialize();
    console.log('✅ Client initialized successfully\n');

    // 3. ヘルスチェック
    console.log('🏥 Performing health check...');
    const health = await client.health();
    console.log('📊 Health status:');
    console.log('  - Database:', health.database.status);
    // console.log('  - Auth:', health.auth.status);
    
    if (health.realtime) {
      console.log('  - Realtime:', health.realtime.status);
    }
    // if (health.storage) {
    //   console.log('  - Storage:', health.storage.status);
    // }

    // 4. 基本的なSQL実行テスト
    console.log('\n🔍 Testing basic SQL execution...');
    try {
      const result = await client.sql('SHOW STREAMS;');
      console.log('✅ SQL execution successful');
      console.log('  Streams found:', result?.length || 0);
    } catch (error) {
      console.log('⚠️  SQL execution failed:', (error as Error).message);
    }

    // 5. Supabase-like API テスト
    console.log('\n📝 Testing Supabase-like API...');
    try {
      // このテストは既存のusers_tableを使用
      const { data, error } = await client
        .from('users_table')
        .select('*')
        .limit(5)
        .execute();
      
      if (error) {
        console.log('⚠️  Query failed:', error.message);
      } else {
        console.log('✅ Query successful');
        console.log('  Records found:', data?.length || 0);
      }
    } catch (error) {
      console.log('⚠️  API test failed:', (error as Error).message);
    }

    console.log('\n🎉 Basic connectivity test completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// テスト実行
if (require.main === module) {
  simpleConfluentTest().catch(console.error);
}

export { simpleConfluentTest }; 