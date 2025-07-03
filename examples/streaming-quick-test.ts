/**
 * ストリーミング機能のクイックテスト
 */

import { createClient } from '../src/index';

async function quickStreamingTest() {
  console.log('⚡ Quick Streaming Test\n');

  try {
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
      auth: {
        jwtSecret: 'quick-test-jwt-secret-key-minimum-32-characters-long',
      },
    });

    await client.initialize();
    console.log('✅ Client initialized\n');

    // Supabase-like ストリーミングテスト
    console.log('🔄 Testing Supabase-like streaming API...');
    
    let dataCount = 0;
    const startTime = Date.now();

    const { terminate } = await client
      .from('users_table')
      .select('*')
      .limit(3)
      .stream(
        (data) => {
          dataCount++;
          console.log(`📥 Received data #${dataCount}:`, JSON.stringify(data, null, 2));
        },
        (error) => {
          console.log('❌ Stream error:', error.message);
        },
        () => {
          console.log('✅ Stream completed');
        }
      );

    // 5秒後に終了
    setTimeout(() => {
      terminate();
      const elapsed = Date.now() - startTime;
      console.log(`\n🎉 Streaming test completed after ${elapsed}ms`);
      console.log(`📊 Total data received: ${dataCount} records`);
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ Quick streaming test failed:', error);
    process.exit(1);
  }
}

// テスト実行
if (require.main === module) {
  quickStreamingTest().catch(console.error);
}

export { quickStreamingTest }; 