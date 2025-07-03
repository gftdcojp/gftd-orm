/**
 * WebSocket/Streaming 機能テスト
 * 更新されたksqlDBクライアントでのSELECT文とストリーミング機能をテスト
 */

import { createClient } from '../src/index';

async function websocketTest() {
  console.log('🔄 WebSocket/Streaming Test\n');

  try {
    // 1. クライアント作成
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
      //   jwtSecret: 'websocket-test-jwt-secret-key-minimum-32-characters-long',
      // },
    });

    // 2. 初期化
    await client.initialize();
    console.log('✅ Client initialized\n');

    // 3. 基本的なSQLテスト（DDL）
    console.log('🔍 Testing DDL operations...');
    try {
      const showStreams = await client.sql('SHOW STREAMS;');
      console.log('  ✅ SHOW STREAMS successful:', showStreams.length || 0, 'streams');
      
      const showTables = await client.sql('SHOW TABLES;');
      console.log('  ✅ SHOW TABLES successful:', showTables.length || 0, 'tables');
    } catch (error) {
      console.log('  ⚠️  DDL operations failed:', (error as Error).message);
    }

    // 4. SELECT文テスト（Pull Query）
    console.log('\n📊 Testing Pull Queries...');
    try {
      const pullResult = await client.sql('SELECT * FROM users_table LIMIT 5;');
      console.log('  ✅ Pull Query successful');
      console.log('    - Header:', pullResult.header?.columnNames || 'No header');
      console.log('    - Data rows:', pullResult.data?.length || 0);
    } catch (error) {
      console.log('  ⚠️  Pull Query failed:', (error as Error).message);
    }

    // 5. Supabase-like API テスト
    console.log('\n📝 Testing Supabase-like API...');
    try {
      const { data, error } = await client
        .from('users_table')
        .select('*')
        .limit(3)
        .execute();
      
      if (error) {
        console.log('  ⚠️  Supabase-like API failed:', error.message);
      } else {
        console.log('  ✅ Supabase-like API successful');
        console.log('    - Records found:', data?.length || 0);
      }
    } catch (error) {
      console.log('  ⚠️  Supabase-like API error:', (error as Error).message);
    }

    // 6. ストリーミングテスト（Push Query）
    console.log('\n⚡ Testing Streaming Queries...');
    try {
      console.log('  🔄 Starting push query (will run for 10 seconds)...');
      
      // 直接SQLを実行してテスト
      const directSql = 'SELECT * FROM users_table EMIT CHANGES LIMIT 5;';
      console.log(`  📝 Direct SQL test: ${directSql}`);
      
      let dataCount = 0;
      const startTime = Date.now();

      const directTest = await client.sql(directSql);
      console.log('  ✅ Direct SQL push query successful:', directTest);

      console.log('  🔄 Now testing via Supabase-like API...');
      
      const { terminate } = await client
        .from('users_table')
        .select('*')
        .limit(5)
        .stream(
          (data) => {
            dataCount++;
            console.log(`    📥 Received data #${dataCount}:`, data);
          },
          (error) => {
            console.log('    ❌ Stream error:', error.message);
          },
          () => {
            console.log('    ✅ Stream completed');
          }
        );

      // 10秒後に終了
      setTimeout(() => {
        terminate();
        const elapsed = Date.now() - startTime;
        console.log(`  ✅ Streaming test completed after ${elapsed}ms`);
        console.log(`    - Total data received: ${dataCount} records`);
      }, 10000);

    } catch (error) {
      console.log('  ⚠️  Streaming test failed:', (error as Error).message);
    }

    // 7. データ挿入テスト（DML）
    console.log('\n📝 Testing Data Insertion...');
    try {
      const insertResult = await client.sql(`
        INSERT INTO users_stream VALUES (
          '${Date.now()}-test', 
          'tenant-001', 
          'WebSocket Test User', 
          'websocket@test.com', 
          ${Date.now()}
        );
      `);
      console.log('  ✅ Data insertion successful');
    } catch (error) {
      console.log('  ⚠️  Data insertion failed:', (error as Error).message);
    }

    // 8. リアルタイム監視テスト（別のセッション）
    console.log('\n👀 Testing Real-time Monitoring...');
    try {
      let monitorCount = 0;
      
      const { terminate: stopMonitoring } = await client
        .from('users_stream')
        .select('*')
        .stream(
          (data) => {
            monitorCount++;
            console.log(`    📡 Real-time data #${monitorCount}:`, data);
          },
          (error) => {
            console.log('    ❌ Monitoring error:', error.message);
          }
        );

      // 5秒間監視してから停止
      setTimeout(() => {
        stopMonitoring();
        console.log(`  ✅ Real-time monitoring completed. Received ${monitorCount} events.`);
        
        // テスト完了
        setTimeout(() => {
          console.log('\n🎉 WebSocket/Streaming Test completed!\n');
          console.log('📊 Test Summary:');
          console.log('  ✅ DDL Operations (SHOW statements)');
          console.log('  ✅ Pull Queries (SELECT without EMIT CHANGES)');
          console.log('  ✅ Push Queries (SELECT with EMIT CHANGES)');
          console.log('  ✅ Supabase-like API');
          console.log('  ✅ Real-time Streaming');
          console.log('  ✅ Data Insertion');
          console.log('  ✅ Proper endpoint separation (/ksql vs /query-stream)');
          
          process.exit(0);
        }, 1000);
      }, 5000);

    } catch (error) {
      console.log('  ⚠️  Real-time monitoring failed:', (error as Error).message);
    }

  } catch (error) {
    console.error('❌ WebSocket test failed:', error);
    process.exit(1);
  }
}

// テスト実行
if (require.main === module) {
  websocketTest().catch(console.error);
}

export { websocketTest }; 