/**
 * Next.js対応のGFTD-ORMクライアント
 * 環境に応じて適切なクライアントを選択
 */

import { isServerSide, isClientSide } from './utils/env';
import { KsqlDbConfig, SchemaRegistryConfig } from './types';

// 条件付きインポート用の型定義
type ServerDatabase = typeof import('./database').Database;
type ClientDatabase = typeof import('./database-client').DatabaseClient;
type ServerRealtime = typeof import('./realtime').Realtime;
type ClientRealtime = typeof import('./realtime-client').RealtimeClient;

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
  realtime?: {
    url: string;
    apiKey?: string;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
  };
  
  // Storage 設定  
  storage?: {
    bucketName: string;
    endpoint: string;
    accessKey?: string;
    secretKey?: string;
  };
  
  // Auth 設定
  auth?: {
    jwtSecret: string;
    providers?: string[];
  };
  
  // 全般設定
  global?: {
    headers?: Record<string, string>;
    schema?: string;
  };
}

/**
 * Next.js対応のGFTD-ORMクライアント
 */
export class GftdOrmClient {
  private config: GftdOrmConfig;
  private _database: any = null;
  private _realtime: any = null;
  private _storage: any = null;
  private _auth: any = null;
  private initialized = false;

  constructor(config: GftdOrmConfig) {
    this.config = config;
  }

  /**
   * データベースクライアントを取得
   */
  get database(): any {
    if (!this._database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this._database;
  }

  /**
   * リアルタイムクライアントを取得
   */
  get realtime(): any {
    if (!this._realtime) {
      throw new Error('Realtime not initialized. Call initialize() first.');
    }
    return this._realtime;
  }

  /**
   * ストレージクライアントを取得
   */
  get storage(): any {
    if (!this._storage) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this._storage;
  }

  /**
   * 認証クライアントを取得
   */
  get auth(): any {
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
      if (isServerSide()) {
        await this.initializeServer();
      } else if (isClientSide()) {
        await this.initializeClient();
      } else {
        throw new Error('Unknown environment');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize GFTD-ORM client:', error);
      throw error;
    }
  }

  /**
   * サーバーサイド初期化
   */
  private async initializeServer(): Promise<void> {
    // Database初期化
    const { createDatabase } = await import('./database');
    this._database = createDatabase({
      ksql: this.config.database.ksql,
      schemaRegistry: this.config.database.schemaRegistry,
    });
    await this._database.initialize();

    // Realtime初期化
    if (this.config.realtime) {
      const { createRealtime } = await import('./realtime');
      this._realtime = createRealtime(this.config.realtime);
    }

    // Storage初期化
    if (this.config.storage) {
      const { createStorage } = await import('./storage');
      this._storage = createStorage(this.config.storage);
      await this._storage.initialize();
    }

    // Auth初期化
    if (this.config.auth) {
      const { createAuth } = await import('./auth');
      this._auth = createAuth(this.config.auth);
      await this._auth.initialize();
    }
  }

  /**
   * クライアントサイド初期化
   */
  private async initializeClient(): Promise<void> {
    // Database初期化（クライアント版）
    const { createDatabaseClient } = await import('./database-client');
    this._database = createDatabaseClient({
      ksql: this.config.database.ksql,
      schemaRegistry: this.config.database.schemaRegistry,
    });
    await this._database.initialize();

    // Realtime初期化（クライアント版）
    if (this.config.realtime) {
      const { createRealtimeClient } = await import('./realtime-client');
      this._realtime = createRealtimeClient(this.config.realtime);
    }

    // Storage初期化（クライアント版）
    if (this.config.storage) {
      const { createStorageClient } = await import('./storage-client');
      this._storage = createStorageClient(this.config.storage);
      await this._storage.initialize();
    }

    // Auth初期化（クライアント版）
    if (this.config.auth) {
      const { createAuthClient } = await import('./auth-client');
      this._auth = createAuthClient(this.config.auth);
      await this._auth.initialize();
    }
  }

  /**
   * Supabaseライクなテーブルアクセス
   */
  from<T = any>(table: string): any {
    return this.database.from<T>(table);
  }

  /**
   * ストレージアクセス（Supabaseライク）
   */
  getStorage() {
    if (!this._storage) {
      throw new Error('Storage module not configured. Please provide storage config when creating the client.');
    }
    return this._storage;
  }

  /**
   * リアルタイムチャンネル（Supabaseライク）
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
    // その他のクリーンアップ
  }
}

/**
 * Next.js対応のクライアント作成関数
 */
export function createClient(config: GftdOrmConfig): GftdOrmClient {
  return new GftdOrmClient(config);
}

/**
 * 環境情報を取得
 */
export function getEnvironmentInfo() {
  const { getEnvironmentInfo } = require('./utils/env');
  return getEnvironmentInfo();
}

/**
 * 使用例の型定義（TypeDoc用）
 * 
 * @example
 * ```typescript
 * // Next.js App Router (Server Component)
 * import { createClient } from '@gftdcojp/gftd-orm/client';
 * 
 * const client = createClient({
 *   url: 'http://localhost:8088',
 *   key: 'your-api-key',
 *   database: {
 *     ksql: {
 *       url: 'http://localhost:8088',
 *       apiKey: 'your-ksql-key',
 *       apiSecret: 'your-ksql-secret'
 *     },
 *     schemaRegistry: {
 *       url: 'http://localhost:8081',
 *       apiKey: 'your-schema-key',
 *       apiSecret: 'your-schema-secret'
 *     }
 *   },
 *   realtime: {
 *     url: 'ws://localhost:8088',
 *     autoReconnect: true
 *   }
 * });
 * 
 * // Server Component
 * export default async function Page() {
 *   await client.initialize();
 *   
 *   const { data } = await client
 *     .from('users')
 *     .select('*')
 *     .eq('status', 'active')
 *     .execute();
 *   
 *   return <div>{data.length} users found</div>;
 * }
 * 
 * // Client Component
 * 'use client';
 * import { createClient } from '@gftdcojp/gftd-orm/client';
 * import { useEffect, useState } from 'react';
 * 
 * export default function ClientComponent() {
 *   const [users, setUsers] = useState([]);
 *   
 *   useEffect(() => {
 *     const client = createClient({...});
 *     
 *     client.initialize().then(() => {
 *       const channel = client.channel('users');
 *       channel.onTable('users', 'INSERT', (payload) => {
 *         setUsers(prev => [...prev, payload.new]);
 *       });
 *       channel.connect();
 *     });
 *   }, []);
 *   
 *   return <div>Real-time users: {users.length}</div>;
 * }
 * ```
 */ 