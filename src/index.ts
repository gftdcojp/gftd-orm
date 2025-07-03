/**
 * GFTD ORM - Enterprise-grade real-time data platform
 * Inspired by Supabase architecture with ksqlDB backend
 */

// Re-export all individual modules
export * from './types';
export * from './field-types';
export * from './schema';
export * from './model';
export * from './query-builder';
export * from './policy';
export * from './context';
export * from './ksqldb-client';
export * from './schema-registry';
export * from './database';
export * from './realtime';

// セキュリティ機能
export * from './config';
export * from './security';
export * from './audit-log';
export * from './rate-limit';

// 新しい設定を使用するためのヘルパー関数
import { getCoreConfig, getDatabaseConfig, getRealtimeConfig, getStorageConfig, getSecurityConfig } from './config';


import { Database, createDatabase } from './database';
import { Realtime, createRealtime, RealtimeConfig } from './realtime';
import { KsqlDbConfig, SchemaRegistryConfig } from './types';

/**
 * GFTD ORM の統合設定
 */
export interface GftdOrmConfig {
  url: string;
  key?: string;
  
  // Database (ksqlDB + Schema Registry) 設定
  database: {
    ksql: KsqlDbConfig;
    schemaRegistry: SchemaRegistryConfig;
  };
  
  // Realtime 設定
  realtime?: RealtimeConfig;
  
  // 全般設定
  global?: {
    headers?: Record<string, string>;
    schema?: string;
  };
}

/**
 * 環境変数から設定を作成（設定ファイルの値を使用）
 */
export function createConfigFromEnv(): GftdOrmConfig {
  const coreConfig = getCoreConfig();
  const databaseConfig = getDatabaseConfig();
  const realtimeConfig = getRealtimeConfig();
  
  return {
    url: coreConfig.url,
    key: coreConfig.serviceRoleKey,
    database: {
      ksql: {
        url: databaseConfig.ksql.url,
        apiKey: databaseConfig.ksql.apiKey,
        apiSecret: databaseConfig.ksql.apiSecret,
      },
      schemaRegistry: {
        url: databaseConfig.schemaRegistry.url,
        auth: databaseConfig.schemaRegistry.authUser && databaseConfig.schemaRegistry.authPassword 
          ? {
              user: databaseConfig.schemaRegistry.authUser,
              pass: databaseConfig.schemaRegistry.authPassword,
            }
          : undefined,
        apiKey: databaseConfig.schemaRegistry.apiKey,
      },
    },
    realtime: {
      url: realtimeConfig.url,
      apiKey: realtimeConfig.apiKey,
      autoReconnect: true,
    },
  };
}

/**
 * メインクライアント - Supabaseライクなインターフェース
 */
export class GftdOrmClient {
  public database: Database;
  public realtime?: Realtime;

  constructor(private config: GftdOrmConfig) {
    // Database は必須
    this.database = createDatabase({
      ksql: config.database.ksql,
      schemaRegistry: config.database.schemaRegistry,
    });

    // オプションのモジュール
    if (config.realtime) {
      this.realtime = createRealtime(config.realtime);
    }
  }

  /**
   * すべてのモジュールを初期化
   */
  async initialize(): Promise<void> {
    // Database を初期化
    await this.database.initialize();

    // その他のモジュールを並行して初期化
    const initPromises: Promise<void>[] = [];

    if (this.realtime) {
      // Realtime は明示的に接続を開始する必要がある場合のみ
    }

    await Promise.all(initPromises);
  }

  /**
   * Supabaseライクなテーブルアクセス
   */
  from<T = any>(table: string): import('./database').DatabaseQueryBuilder<T> {
    return this.database.from<T>(table);
  }

  /**
   * ストレージアクセス（Supabaseライク）
   */
  getStorage() {
    if (!this.storage) {
      throw new Error('Storage module not configured. Please provide storage config when creating the client.');
    }
    return this.storage;
  }

  /**
   * リアルタイムチャンネル（Supabaseライク）
   */
  channel(name: string) {
    if (!this.realtime) {
      throw new Error('Realtime module not configured. Please provide realtime config when creating the client.');
    }
    return this.realtime.channel(name);
  }

  /**
   * SQL クエリを直接実行
   */
  async sql(query: string, params?: any[]) {
    return this.database.sql(query, params);
  }

  /**
   * ヘルスチェック
   */
  async health() {
    const results = await Promise.allSettled([
      this.database.health(),
      this.realtime ? Promise.resolve({ status: 'ok' as const, details: this.realtime.getConnectionStatus() }) : Promise.resolve({ status: 'disabled' as const }),
      this.storage ? Promise.resolve({ status: 'ok' as const }) : Promise.resolve({ status: 'disabled' as const }),
      this.auth ? Promise.resolve({ status: 'ok' as const }) : Promise.resolve({ status: 'disabled' as const }),
    ]);

    return {
      database: results[0].status === 'fulfilled' ? results[0].value : { status: 'error', details: (results[0] as PromiseRejectedResult).reason },
      realtime: results[1].status === 'fulfilled' ? results[1].value : { status: 'error' },
      storage: results[2].status === 'fulfilled' ? results[2].value : { status: 'error' },
      auth: results[3].status === 'fulfilled' ? results[3].value : { status: 'error' },
    };
  }

  /**
   * すべての接続を閉じる
   */
  async disconnect(): Promise<void> {
    if (this.realtime) {
      this.realtime.disconnect();
    }
    // Database, Storage, Auth のクリーンアップは必要に応じて実装
  }
}

/**
 * Supabase ライクなクライアント作成関数
 */
export function createClient(config: GftdOrmConfig): GftdOrmClient {
  return new GftdOrmClient(config);
}

/**
 * 環境変数から自動的にクライアントを作成
 */
export function createClientFromEnv(): GftdOrmClient {
  const config = createConfigFromEnv();
  return new GftdOrmClient(config);
}

// 後方互換性のため、既存の関数もエクスポート
export { init, OrmConfig, defineSchema, defineModel, definePolicy, healthCheck } from './index-legacy';

/**
 * 使用例の型定義（TypeDoc用）
 * 
 * @example
 * ```typescript
 * import { createClient, createClientFromEnv } from 'gftd-orm';
 * 
 * // 環境変数から自動作成
 * const client = createClientFromEnv();
 * 
 * // または手動設定
 * const client = createClient({
 *   url: process.env.GFTD_URL!,
 *   key: process.env.GFTD_SERVICE_ROLE_KEY!,
 *   database: {
 *     ksql: {
 *       url: process.env.GFTD_DB_URL!,
 *       apiKey: process.env.GFTD_DB_API_KEY,
 *       apiSecret: process.env.GFTD_DB_API_SECRET,
 *     },
 *     schemaRegistry: {
 *       url: process.env.GFTD_SCHEMA_REGISTRY_URL!,
 *       auth: {
 *         user: process.env.GFTD_SCHEMA_REGISTRY_AUTH_USER!,
 *         pass: process.env.GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD!,
 *       },
 *     }
 *   },
 *   realtime: {
 *     url: process.env.GFTD_REALTIME_URL!,
 *     apiKey: process.env.GFTD_REALTIME_API_KEY,
 *     autoReconnect: true
 *   },
 *   storage: {
 *     bucketName: process.env.GFTD_STORAGE_BUCKET!,
 *     endpoint: process.env.GFTD_STORAGE_ENDPOINT!,
 *     accessKeyId: process.env.GFTD_STORAGE_ACCESS_KEY!,
 *     secretAccessKey: process.env.GFTD_STORAGE_SECRET_KEY!,
 *   },
 *   auth: {
 *     jwtSecret: process.env.GFTD_JWT_SECRET!,
 *   }
 * });
 * 
 * // 初期化
 * await client.initialize();
 * 
 * // Database操作（Supabaseライク）
 * const { data, error } = await client
 *   .from('users')
 *   .select('*')
 *   .eq('status', 'active')
 *   .execute();
 * 
 * // Realtime監視
 * const channel = client.channel('user-changes');
 * channel.onTable('users', 'INSERT', (payload) => {
 *   console.log('New user:', payload);
 * });
 * await channel.connect();
 * 
 * // Storage操作
 * const { data: file } = await client.storage.upload(
 *   'avatars/user.jpg',
 *   fileBuffer
 * );
 * 
 * // Auth操作
 * const { data: session } = await client.auth?.signIn({
 *   email: 'user@example.com',
 *   password: 'password'
 * });
 * ```
 */ 