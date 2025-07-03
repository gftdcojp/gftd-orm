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
export * from './storage';
export * from './auth';

import { Database, createDatabase } from './database';
import { Realtime, createRealtime, RealtimeConfig } from './realtime';
import { Storage, createStorage, StorageConfig } from './storage';
import { Auth, createAuth, AuthConfig } from './auth';
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
  
  // Storage 設定  
  storage?: StorageConfig;
  
  // Auth 設定
  auth?: AuthConfig;
  
  // 全般設定
  global?: {
    headers?: Record<string, string>;
    schema?: string;
  };
}

/**
 * メインクライアント - Supabaseライクなインターフェース
 */
export class GftdOrmClient {
  public database: Database;
  public realtime?: Realtime;
  public storage?: Storage;
  public auth?: Auth;

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

    if (config.storage) {
      this.storage = createStorage(config.storage);
    }

    if (config.auth) {
      this.auth = createAuth(config.auth);
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

    if (this.storage) {
      initPromises.push(this.storage.initialize());
    }

    if (this.auth) {
      initPromises.push(this.auth.initialize());
    }

    await Promise.all(initPromises);
  }

  /**
   * Supabaseライクなテーブルアクセス
   */
  from<T = any>(table: string) {
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

// 後方互換性のため、既存の関数もエクスポート
export { init, OrmConfig, defineSchema, defineModel, definePolicy, healthCheck } from './index-legacy';

/**
 * 使用例の型定義（TypeDoc用）
 * 
 * @example
 * ```typescript
 * import { createClient } from 'gftd-orm';
 * 
 * const client = createClient({
 *   url: 'http://localhost:8088',
 *   key: 'your-api-key',
 *   database: {
 *     ksql: {
 *       url: 'http://localhost:8088',
 *       auth: { username: 'admin', password: 'admin' }
 *     },
 *     schemaRegistry: {
 *       url: 'http://localhost:8081',
 *       auth: { username: 'admin', password: 'admin' }
 *     }
 *   },
 *   realtime: {
 *     url: 'ws://localhost:8088',
 *     autoReconnect: true
 *   },
 *   storage: {
 *     bucketName: 'my-bucket',
 *     endpoint: 'http://localhost:9000'
 *   },
 *   auth: {
 *     jwtSecret: 'your-jwt-secret'
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