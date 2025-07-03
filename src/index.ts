/**
 * GFTD ORM - Enterprise-grade real-time data platform (Minimal Export)
 * Inspired by Supabase architecture with ksqlDB backend
 */

// Re-export basic modules only
export * from './types';
export * from './field-types';
export * from './schema';
export * from './ksqldb-client';
export * from './schema-registry';
export * from './realtime';

// セキュリティ機能（一部）
export * from './config';
export * from './audit-log';
export * from './rate-limit';

// Realtime configuration
import { RealtimeConfig } from './realtime';
import { KsqlDbConfig, SchemaRegistryConfig } from './types';

/**
 * GFTD ORM の統合設定（最小版）
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
 * 簡易クライアント（最小版）
 */
export class GftdOrmClient {
  constructor(private config: GftdOrmConfig) {}

  /**
   * 簡易初期化（プレースホルダー）
   */
  async initialize(): Promise<void> {
    console.log('GFTD ORM Client initialized (minimal version)');
  }

  /**
   * 簡易ヘルスチェック
   */
  async health() {
    return {
      status: 'ok',
      version: '25.07.4',
      features: ['basic', 'minimal'],
    };
  }
}

/**
 * 簡易クライアント作成関数
 */
export function createClient(config: GftdOrmConfig): GftdOrmClient {
  return new GftdOrmClient(config);
}

/**
 * 後方互換性のため（プレースホルダー）
 */
export const defineSchema = () => { throw new Error('defineSchema is temporarily disabled'); };
export const defineModel = () => { throw new Error('defineModel is temporarily disabled'); };
export const definePolicy = () => { throw new Error('definePolicy is temporarily disabled'); };
export const init = () => { throw new Error('init is temporarily disabled'); };
export const healthCheck = () => { throw new Error('healthCheck is temporarily disabled'); };

export interface OrmConfig {
  // プレースホルダー
} 