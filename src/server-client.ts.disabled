/**
 * サーバー専用クライアント（Next.js Server Components, API Routes, Server Actions用）
 */

import { Database } from './database';
import { Realtime } from './realtime';
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
    ]);

    return {
      database: results[0].status === 'fulfilled' ? results[0].value : { status: 'error', details: (results[0] as PromiseRejectedResult).reason },
      realtime: results[1].status === 'fulfilled' ? results[1].value : { status: 'error' },
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