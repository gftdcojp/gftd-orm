/**
 * Configuration Management - 環境変数とセキュリティ設定
 */

import dotenv from 'dotenv';
import { log } from './utils/logger';

// 環境変数を読み込み
dotenv.config();

/**
 * 環境変数の型定義
 */
interface CoreConfig {
  url: string;
  serviceRoleKey?: string;
  anonKey?: string;
}

interface DatabaseConfig {
  ksql: {
    url: string;
    apiKey?: string;
    apiSecret?: string;
  };
  schemaRegistry: {
    url: string;
    authUser?: string;
    authPassword?: string;
    apiKey?: string;
  };
}

interface RealtimeConfig {
  url: string;
  apiKey?: string;
}

/**
 * 環境変数を取得する関数（必須チェック付き）
 */
function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

/**
 * 環境変数を取得する関数（オプショナル）
 */
function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

/**
 * 数値の環境変数を取得
 */
function getNumberEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

/**
 * ブール値の環境変数を取得
 */
function getBooleanEnvVar(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// 設定のキャッシュ
let _coreConfig: CoreConfig | null = null;
let _databaseConfig: DatabaseConfig | null = null;
let _realtimeConfig: RealtimeConfig | null = null;

/**
 * コア設定 (遅延評価)
 */
export function getCoreConfig(): CoreConfig {
  if (!_coreConfig) {
    _coreConfig = {
      url: getEnvVar('GFTD_URL', 'http://localhost:8088'),
      serviceRoleKey: getOptionalEnvVar('GFTD_SERVICE_ROLE_KEY'),
      anonKey: getOptionalEnvVar('GFTD_ANON_KEY'),
    };
  }
  return _coreConfig;
}



/**
 * データベース設定 (遅延評価)
 */
export function getDatabaseConfig(): DatabaseConfig {
  if (!_databaseConfig) {
    _databaseConfig = {
      ksql: {
        url: getEnvVar('GFTD_DB_URL', 'http://localhost:8088'),
        apiKey: getOptionalEnvVar('GFTD_DB_API_KEY'),
        apiSecret: getOptionalEnvVar('GFTD_DB_API_SECRET'),
      },
      schemaRegistry: {
        url: getEnvVar('GFTD_SCHEMA_REGISTRY_URL', 'http://localhost:8081'),
        authUser: getOptionalEnvVar('GFTD_SCHEMA_REGISTRY_AUTH_USER'),
        authPassword: getOptionalEnvVar('GFTD_SCHEMA_REGISTRY_AUTH_PASSWORD'),
        apiKey: getOptionalEnvVar('GFTD_SCHEMA_REGISTRY_API_KEY'),
      },
    };
  }
  return _databaseConfig;
}

/**
 * リアルタイム設定 (遅延評価)
 */
export function getRealtimeConfig(): RealtimeConfig {
  if (!_realtimeConfig) {
    _realtimeConfig = {
      url: getEnvVar('GFTD_REALTIME_URL', 'ws://localhost:8088'),
      apiKey: getOptionalEnvVar('GFTD_REALTIME_API_KEY'),
    };
  }
  return _realtimeConfig;
}



// 遅延評価を維持するため、直接的な設定エクスポートは削除
// 各設定は get*Config() 関数を通してアクセスしてください

/**
 * 設定の検証
 */
export function validateConfig(): void {
  // 基本的な設定の存在確認
  const core = getCoreConfig();
  const database = getDatabaseConfig();
  const realtime = getRealtimeConfig();
  
  if (!core.url) {
    throw new Error('GFTD_URL is required');
  }
  
  if (!database.ksql.url) {
    throw new Error('GFTD_DB_URL is required');
  }
  
  if (!database.schemaRegistry.url) {
    throw new Error('GFTD_SCHEMA_REGISTRY_URL is required');
  }
}

/**
 * 設定の初期化
 */
export function initializeConfig(): void {
  try {
    validateConfig();
    log.success('Configuration validated successfully');
  } catch (error) {
    log.failure('Configuration validation failed:', error);
    process.exit(1);
  }
}

/**
 * 開発環境かどうかを判定
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 本番環境かどうかを判定
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * テスト環境かどうかを判定
 */
export const isTest = process.env.NODE_ENV === 'test'; 