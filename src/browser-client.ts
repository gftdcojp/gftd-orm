/**
 * ブラウザ専用クライアント（Next.js Client Components用）
 */

import { KsqlDbConfig, SchemaRegistryConfig } from './types';
import { DatabaseClient } from './database-client';
import { RealtimeClient } from './realtime-client';

export interface BrowserClientConfig {
  url: string;
  key?: string;
  
  database: {
    ksql: Pick<KsqlDbConfig, 'url' | 'headers'> & {
      // ブラウザでは公開可能な設定のみ
      apiKey?: string; // PUBLIC key only
    };
    schemaRegistry: Pick<SchemaRegistryConfig, 'url'> & {
      apiKey?: string; // PUBLIC key only
    };
  };
  
  realtime?: {
    url: string;
    apiKey?: string; // PUBLIC key only
    autoReconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  };
}

/**
 * ブラウザ専用のGFTD-ORMクライアント
 */
export class BrowserClient {
  private config: BrowserClientConfig;
  private _database: DatabaseClient | null = null;
  private _realtime: RealtimeClient | null = null;
  private initialized = false;

  constructor(config: BrowserClientConfig) {
    if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') {
      throw new Error('BrowserClient can only be used in browser environment');
    }
    this.config = config;
  }

  /**
   * データベースクライアントを取得
   */
  get database(): DatabaseClient {
    if (!this._database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this._database;
  }

  /**
   * リアルタイムクライアントを取得
   */
  get realtime(): RealtimeClient {
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
      // Database初期化（ブラウザ版）
      this._database = new DatabaseClient({
        ksql: {
          url: this.config.database.ksql.url,
          apiKey: this.config.database.ksql.apiKey,
          headers: this.config.database.ksql.headers,
        },
        schemaRegistry: {
          url: this.config.database.schemaRegistry.url,
          apiKey: this.config.database.schemaRegistry.apiKey,
        },
      });
      await this._database.initialize();

      // Realtime初期化（ブラウザ版）
      if (this.config.realtime) {
        this._realtime = new RealtimeClient(this.config.realtime);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize browser client:', error);
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
      throw new Error('Realtime not configured. Please provide realtime config when creating the client.');
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
      this._realtime ? Promise.resolve({ status: 'ok' as const }) : Promise.resolve({ status: 'disabled' as const }),
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
  }
}

/**
 * ブラウザ専用クライアント作成関数
 */
export function createBrowserClient(config: BrowserClientConfig): BrowserClient {
  return new BrowserClient(config);
} 