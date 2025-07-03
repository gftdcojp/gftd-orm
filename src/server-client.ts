/**
 * サーバー専用クライアント（Next.js Server Components, API Routes, Server Actions用）
 */

import { Database } from './database';
import { Realtime } from './realtime';
import { Storage, StorageConfig } from './storage';
import { Auth, AuthConfig } from './auth';
import { KsqlDbConfig, SchemaRegistryConfig } from './types';

export interface ServerClientConfig {
  url: string;
  key?: string;
  
  database: {
    ksql: KsqlDbConfig; // サーバーでは全ての設定が使用可能
    schemaRegistry: SchemaRegistryConfig;
  };
  
  realtime?: {
    url: string;
    apiKey?: string;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  };
  
  // サーバーでは全機能が使用可能
  storage?: StorageConfig;
  auth?: AuthConfig;
  
  global?: {
    headers?: Record<string, string>;
    schema?: string;
  };
}

/**
 * サーバー専用のGFTD-ORMクライアント
 */
export class ServerClient {
  private config: ServerClientConfig;
  private _database: Database | null = null;
  private _realtime: Realtime | null = null;
  private _storage: Storage | null = null;
  private _auth: Auth | null = null;
  private initialized = false;

  constructor(config: ServerClientConfig) {
    if (typeof process === 'undefined' || !process.versions?.node) {
      throw new Error('ServerClient can only be used in Node.js environment');
    }
    this.config = config;
  }

  /**
   * データベースクライアントを取得
   */
  get database(): Database {
    if (!this._database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this._database;
  }

  /**
   * リアルタイムクライアントを取得
   */
  get realtime(): Realtime {
    if (!this._realtime) {
      throw new Error('Realtime not initialized. Call initialize() first.');
    }
    return this._realtime;
  }

  /**
   * ストレージクライアントを取得
   */
  get storage(): Storage {
    if (!this._storage) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this._storage;
  }

  /**
   * 認証クライアントを取得
   */
  get auth(): Auth {
    if (!this._auth) {
      throw new Error('Auth not initialized. Call initialize() first.');
    }
    return this._auth;
  }

  /**
   * クライアントを初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Database初期化（サーバー版）
      const { createDatabase } = await import('./database');
      this._database = createDatabase({
        ksql: this.config.database.ksql,
        schemaRegistry: this.config.database.schemaRegistry,
      });
      await this._database.initialize();

      // Realtime初期化（サーバー版）
      if (this.config.realtime) {
        const { createRealtime } = await import('./realtime');
        this._realtime = createRealtime(this.config.realtime);
      }

      // Storage初期化（サーバー版）
      if (this.config.storage) {
        const { createStorage } = await import('./storage');
        this._storage = createStorage(this.config.storage);
        await this._storage.initialize();
      }

      // Auth初期化（サーバー版）
      if (this.config.auth) {
        const { createAuth } = await import('./auth');
        this._auth = createAuth(this.config.auth);
        await this._auth.initialize();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize server client:', error);
      throw error;
    }
  }

  /**
   * Supabaseライクなテーブルアクセス
   */
  from<T = any>(table: string) {
    return this.database.from<T>(table);
  }

  /**
   * ストレージアクセス
   */
  getStorage() {
    if (!this._storage) {
      throw new Error('Storage module not configured. Please provide storage config when creating the client.');
    }
    return this._storage;
  }

  /**
   * リアルタイムチャンネル
   */
  channel(name: string) {
    if (!this._realtime) {
      throw new Error('Realtime module not configured. Please provide realtime config when creating the client.');
    }
    return this._realtime.channel(name);
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
      this._realtime ? Promise.resolve({ status: 'ok' as const, details: this._realtime.getConnectionStatus() }) : Promise.resolve({ status: 'disabled' as const }),
      this._storage ? Promise.resolve({ status: 'ok' as const }) : Promise.resolve({ status: 'disabled' as const }),
      this._auth ? Promise.resolve({ status: 'ok' as const }) : Promise.resolve({ status: 'disabled' as const }),
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
    if (this._realtime) {
      this._realtime.disconnect();
    }
    // その他のクリーンアップ処理
  }
}

/**
 * サーバー専用クライアント作成関数
 */
export function createServerClient(config: ServerClientConfig): ServerClient {
  return new ServerClient(config);
} 