/**
 * GFTD ORM - Enterprise-grade real-time data platform
 * Inspired by Supabase architecture with ksqlDB backend
 */

// Re-export all modules
export * from './types';
export * from './field-types';
export * from './schema';
export * from './ksqldb-client';
export * from './schema-registry';
export * from './realtime';
export * from './config';
export * from './audit-log';
export * from './rate-limit';
export * from './utils/logger';
export * from './database-client';
export * from './browser-client';
export * from './http-client';

// 🚀 NEW: Type Generation Features
export * from './type-generator';
export { runCli } from './cli';

// Import required modules for client implementation
import { initializeKsqlDbClient, getClientConfig as getKsqlConfig } from './ksqldb-client';
import { initializeSchemaRegistryClient, getSchemaRegistryConfig } from './schema-registry';
import { createRealtime, Realtime } from './realtime';
import { validateConfig, getCoreConfig, getDatabaseConfig, getRealtimeConfig } from './config';
import { KsqlDbConfig, SchemaRegistryConfig } from './types';
import { log } from './utils/logger';

/**
 * Realtime configuration
 */
interface RealtimeConfig {
  url: string;
  apiKey?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * GFTD ORM 統合設定
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
 * 統合クライアント
 */
export class GftdOrmClient {
  private realtimeClient: Realtime | null = null;
  private initialized = false;

  constructor(private config: GftdOrmConfig) {}

  /**
   * クライアント初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.info('GFTD ORM Client already initialized');
      return;
    }

    try {
      // ksqlDBクライアントを初期化
      initializeKsqlDbClient(this.config.database.ksql);
      
      // Schema Registryクライアントを初期化
      initializeSchemaRegistryClient(this.config.database.schemaRegistry);
      
      // Realtimeクライアントを初期化（設定がある場合）
      if (this.config.realtime) {
        this.realtimeClient = createRealtime(this.config.realtime);
      }

      this.initialized = true;
      log.success('GFTD ORM Client initialized successfully');
      
    } catch (error) {
      log.failure('Failed to initialize GFTD ORM Client:', error);
      throw error;
    }
  }

  /**
   * ヘルスチェック
   */
  async health() {
    const ksqlConfig = getKsqlConfig();
    const schemaRegistryConfig = getSchemaRegistryConfig();
    
    return {
      status: 'ok',
      version: '25.07.6',
      features: this.initialized ? ['database', 'schema-registry', 'realtime', 'audit', 'rate-limit'] : ['basic'],
      connections: {
        ksqldb: ksqlConfig ? 'connected' : 'disconnected',
        schemaRegistry: schemaRegistryConfig ? 'connected' : 'disconnected',
        realtime: this.realtimeClient ? 'connected' : 'disconnected',
      },
    };
  }

  /**
   * リアルタイムチャンネルを取得
   */
  channel(topic: string) {
    if (!this.realtimeClient) {
      throw new Error('Realtime client is not initialized. Please provide realtime configuration.');
    }
    return this.realtimeClient.channel(topic);
  }

  /**
   * 接続状態を確認
   */
  isConnected(): boolean {
    return this.initialized;
  }

  /**
   * クライアントを閉じる
   */
  disconnect(): void {
    if (this.realtimeClient) {
      this.realtimeClient.disconnect();
    }
    this.initialized = false;
    log.info('GFTD ORM Client disconnected');
  }
}

/**
 * 統合クライアント作成関数
 */
export function createClient(config: GftdOrmConfig): GftdOrmClient {
  return new GftdOrmClient(config);
}

// Re-export commonly used functions for convenience
export { defineSchema } from './schema';
export { FieldType } from './field-types';
export { 
  executeQuery, 
  executePullQuery, 
  executePushQuery, 
  listStreams, 
  listTables 
} from './ksqldb-client';
export { 
  registerSchema, 
  getLatestSchema, 
  listSubjects 
} from './schema-registry';
export { AuditLogManager } from './audit-log';
export { RateLimitManager } from './rate-limit';

/**
 * 設定の初期化と検証
 */
export function init(): void {
  validateConfig();
  log.success('GFTD ORM configuration validated');
}

/**
 * ヘルスチェック（スタンドアロン）
 */
export async function healthCheck() {
  const core = getCoreConfig();
  const database = getDatabaseConfig();
  const realtime = getRealtimeConfig();
  
  return {
    status: 'ok',
    version: '25.07.6',
    config: {
      core: !!core.url,
      database: !!database.ksql.url && !!database.schemaRegistry.url,
      realtime: !!realtime.url,
    },
  };
} 