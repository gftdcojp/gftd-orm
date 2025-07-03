/**
 * GFTD ORM Demo - Supabaseライクな統合API
 * 
 * Database, Realtime, Storage, Auth の全機能を統合したデモ
 */

import { createClient } from '../src/index';
import { FieldType, defineSchema, defineModel, definePolicy, StreamType } from '../src/index';

async function main() {
  console.log('🚀 GFTD ORM Demo - Supabaseライクな統合API\n');

  // ===================================
  // 1. クライアント作成と初期化
  // ===================================
  
  const client = createClient({
    url: 'http://localhost:8088',
    key: 'gftd-orm-demo-key',
    
         // Database設定（必須）
     database: {
       ksql: {
         url: 'http://localhost:8088',
         apiKey: 'admin',
         apiSecret: 'admin',
       },
       schemaRegistry: {
         url: 'http://localhost:8081',
         auth: {
           user: 'admin',
           pass: 'admin',
         },
       },
     },
    
    // Realtime設定（オプション）
    realtime: {
      url: 'ws://localhost:8088',
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
    },
    
    // Storage設定（オプション）
    storage: {
      bucketName: 'gftd-storage',
      endpoint: 'http://localhost:9000',
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
      publicUrl: 'http://localhost:9000',
    },
    
    // Auth設定（オプション）
    auth: {
      jwtSecret: 'gftd-orm-super-secret-key-for-demo',
      allowAnonymous: true,
      providers: {
        email: {
          enabled: true,
          requireConfirmation: false,
        },
        google: {
          clientId: 'demo-google-client-id',
          clientSecret: 'demo-google-client-secret',
        },
      },
    },
  });

  // 初期化
  console.log('📦 Initializing GFTD ORM client...');
  await client.initialize();
  console.log('✅ Client initialized successfully\n');

  // ===================================
  // 2. スキーマ＆モデル定義（Database）
  // ===================================
  
  console.log('🗂️  Defining schemas and models...');
  
  // ユーザースキーマ定義
  const UserSchema = defineSchema('User', {
    id: FieldType.UUID.primaryKey(),
    tenantId: FieldType.UUID.notNull(),
    name: FieldType.STRING.notNull(),
    email: FieldType.STRING.notNull(),
    status: FieldType.STRING.withDefault('active'),
    created: FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
         metadata: FieldType.STRING, // JSON文字列（nullable）
  });

  // メッセージスキーマ定義
  const MessageSchema = defineSchema('Message', {
    id: FieldType.UUID.primaryKey(),
    userId: FieldType.UUID.notNull(),
    content: FieldType.STRING.notNull(),
    timestamp: FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
    type: FieldType.STRING.withDefault('text'),
  });

  // ユーザーモデル（TABLE）
  const User = defineModel({
    schema: UserSchema,
    type: StreamType.TABLE,
    topic: 'users',
    key: 'id',
  });

     // メッセージモデル（STREAM）
   const Message = defineModel({
     schema: MessageSchema,
     type: StreamType.STREAM,
     topic: 'messages',
     key: 'id',
   });

  // RLSポリシー定義
  definePolicy(UserSchema.name, (ctx) => {
    return `tenantId = '${ctx.tenantId}'`;
  });

  console.log('✅ Schemas and models defined\n');

  // ===================================
  // 3. Database操作（Supabaseライク）
  // ===================================
  
  console.log('💾 Database operations...');
  
  try {
    // データ挿入
    const newUser = await client
      .from('users')
      .insert({
        id: 'user-001',
        tenantId: 'tenant-001',
        name: '田中太郎',
        email: 'tanaka@example.com',
        status: 'active',
      });
    
    console.log('  ✅ User inserted:', newUser.data);

    // データ取得
    const users = await client
      .from('users')
      .select('*')
      .eq('status', 'active')
      .order('created', false)
      .limit(10)
      .execute();
    
    console.log('  ✅ Users fetched:', users.data?.length || 0, 'records');

    // 単一レコード取得
    const user = await client
      .from('users')
      .select('id, name, email')
      .eq('id', 'user-001')
      .single();
    
    console.log('  ✅ Single user:', user.data?.name);

    // データ更新
    const updatedUser = await client
      .from('users')
      .eq('id', 'user-001')
      .update({ status: 'premium' });
    
    console.log('  ✅ User updated:', updatedUser.data);

    // SQL直接実行
    const sqlResult = await client.sql(`
      SELECT COUNT(*) as user_count 
      FROM users_table 
      WHERE status = 'active'
    `);
    
    console.log('  ✅ SQL query result:', sqlResult);

  } catch (error) {
    console.log('  ⚠️  Database operations (mocked):', error);
  }

  console.log('');

  // ===================================
  // 4. Realtime機能
  // ===================================
  
  console.log('⚡ Setting up realtime subscriptions...');
  
  try {
    // ユーザー変更の監視
    const userChannel = client.channel('user-changes');
    
    userChannel.onTable('users', 'INSERT', (payload) => {
      console.log('  📥 New user created:', payload);
    });
    
    userChannel.onTable('users', 'UPDATE', (payload) => {
      console.log('  📝 User updated:', payload);
    });

    // メッセージストリームの監視
    userChannel.onStream('messages', (payload) => {
      console.log('  💬 New message:', payload);
    });

    // ブロードキャスト監視
    userChannel.onBroadcast('notifications', (payload) => {
      console.log('  🔔 Notification:', payload);
    });

    // プレゼンス機能
    userChannel.presence.track({
      user_id: 'user-001',
      status: 'online',
      last_seen: new Date().toISOString(),
    });

    userChannel.presence.onChange((payload) => {
      console.log('  👥 Presence changed:', payload);
    });

    // チャンネル接続
    await userChannel.connect();
    console.log('  ✅ Realtime channel connected');

    // メッセージをブロードキャスト
    await userChannel.broadcast('notifications', {
      type: 'user_joined',
      user: 'tanaka@example.com',
      timestamp: new Date().toISOString(),
    });

    console.log('  ✅ Message broadcasted');

  } catch (error) {
    console.log('  ⚠️  Realtime operations (mocked):', error);
  }

  console.log('');

  // ===================================
  // 5. Storage機能
  // ===================================
  
  console.log('🗄️  Storage operations...');
  
  try {
    const storage = client.getStorage();

    // バケット作成
    const bucket = await storage.bucket.create('user-files', { public: false });
    console.log('  ✅ Bucket created:', bucket.data?.name);

    // ファイルアップロード
    const fileContent = Buffer.from('Hello, GFTD ORM Storage!');
    const uploadResult = await storage.upload(
      'documents/demo.txt',
      fileContent,
      {
        contentType: 'text/plain',
        metadata: { uploadedBy: 'user-001', demo: 'true' },
      }
    );
    
    console.log('  ✅ File uploaded:', uploadResult.data?.name);

    // ファイル一覧取得
    const files = await storage.list('documents/');
    console.log('  ✅ Files listed:', files.data.length, 'files');

    // ファイルダウンロード
    const downloadResult = await storage.download('documents/demo.txt');
    console.log('  ✅ File downloaded:', downloadResult.data?.byteLength || 0, 'bytes');

    // 署名付きURL生成
    const signedUrl = storage.createSignedUrl('documents/demo.txt', 3600);
    console.log('  ✅ Signed URL created:', signedUrl.data?.signedUrl);

    // 公開URL取得
    const publicUrl = storage.getPublicUrl('documents/demo.txt');
    console.log('  ✅ Public URL:', publicUrl.data.publicUrl);

  } catch (error) {
    console.log('  ⚠️  Storage operations (mocked):', error);
  }

  console.log('');

  // ===================================
  // 6. Auth機能
  // ===================================
  
  console.log('🔐 Authentication operations...');
  
  try {
    const auth = client.auth;
    if (!auth) {
      console.log('  ⚠️  Auth module not configured');
      return;
    }

    // ユーザー登録
    const signUpResult = await auth.signUp({
      email: 'demo@example.com',
      password: 'demo-password-123',
      options: {
        data: { name: 'Demo User', role: 'user' },
      },
    });
    
    console.log('  ✅ User signed up:', signUpResult.data.user?.email);

    // ログイン
    const signInResult = await auth.signIn({
      email: 'demo@example.com',
      password: 'demo-password-123',
    });
    
    console.log('  ✅ User signed in:', signInResult.data.user?.email);

    // 現在のユーザー取得
    const currentUser = auth.getUser();
    console.log('  ✅ Current user:', currentUser?.email);

    // OAuth ログイン（デモ）
    const oauthResult = await auth.signInWithOAuth('google');
    console.log('  ✅ OAuth sign in:', oauthResult.data.user?.email);

    // ユーザー情報更新
    const updateResult = await auth.updateUser({
      user_metadata: { preferences: { theme: 'dark' } },
    });
    
    console.log('  ✅ User updated:', updateResult.data?.email);

    // トークン検証
    const session = auth.getSession();
    if (session) {
      const verification = await auth.verifyToken(session.access_token);
      console.log('  ✅ Token verified:', verification.valid);
    }

    // 管理者機能
    const adminUsers = await auth.admin.listUsers({ page: 1, perPage: 10 });
    console.log('  ✅ Admin users listed:', adminUsers.data.length, 'users');

  } catch (error) {
    console.log('  ⚠️  Auth operations (mocked):', error);
  }

  console.log('');

  // ===================================
  // 7. ヘルスチェック
  // ===================================
  
  console.log('🏥 Health check...');
  
  try {
    const health = await client.health();
    console.log('  📊 System health:');
    console.log('    - Database:', health.database.status);
    console.log('    - Realtime:', health.realtime.status);
    console.log('    - Storage:', health.storage.status);
    console.log('    - Auth:', health.auth.status);
  } catch (error) {
    console.log('  ⚠️  Health check failed:', error);
  }

  console.log('');

  // ===================================
  // 8. クリーンアップ
  // ===================================
  
  console.log('🧹 Cleaning up...');
  
  try {
    // ログアウト
    if (client.auth) {
      await client.auth.signOut();
      console.log('  ✅ User signed out');
    }

    // リアルタイム接続切断
    await client.disconnect();
    console.log('  ✅ Connections closed');

  } catch (error) {
    console.log('  ⚠️  Cleanup failed:', error);
  }

  console.log('\n🎉 GFTD ORM Demo completed successfully!');
  console.log('\n📖 Summary:');
  console.log('   - ✅ Database: ksqlDB + Schema Registry');
  console.log('   - ✅ Realtime: WebSocket subscriptions');
  console.log('   - ✅ Storage: S3-compatible file storage');
  console.log('   - ✅ Auth: JWT-based authentication');
  console.log('   - ✅ Unified API: Supabase-like interface');
}

// デモ実行
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
} 