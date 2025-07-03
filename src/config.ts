/**
 * Configuration Management - 環境変数とセキュリティ設定
 */

import dotenv from 'dotenv';

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

interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    algorithm: string;
  };
  bcrypt: {
    rounds: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  session: {
    timeoutMs: number;
  };
  cors: {
    origins: string[];
    credentials: boolean;
  };
  audit: {
    enabled: boolean;
    logFile: string;
  };
  logging: {
    level: string;
  };
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

interface StorageConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

interface OAuthConfig {
  google?: {
    clientId: string;
    clientSecret: string;
  };
  github?: {
    clientId: string;
    clientSecret: string;
  };
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
let _securityConfig: SecurityConfig | null = null;
let _databaseConfig: DatabaseConfig | null = null;
let _realtimeConfig: RealtimeConfig | null = null;
let _storageConfig: StorageConfig | null = null;
let _oauthConfig: OAuthConfig | null = null;

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
 * セキュリティ設定 (遅延評価)
 */
export function getSecurityConfig(): SecurityConfig {
  if (!_securityConfig) {
    _securityConfig = {
      jwt: {
        secret: getEnvVar('GFTD_JWT_SECRET'),
        expiresIn: getOptionalEnvVar('GFTD_JWT_EXPIRES_IN', '1h') || '1h',
        algorithm: getOptionalEnvVar('GFTD_JWT_ALGORITHM', 'HS256') || 'HS256',
      },
      bcrypt: {
        rounds: getNumberEnvVar('GFTD_BCRYPT_ROUNDS', 12),
      },
      rateLimit: {
        windowMs: getNumberEnvVar('GFTD_RATE_LIMIT_WINDOW_MS', 900000), // 15分
        maxRequests: getNumberEnvVar('GFTD_RATE_LIMIT_MAX_REQUESTS', 100),
      },
      session: {
        timeoutMs: getNumberEnvVar('GFTD_SESSION_TIMEOUT_MS', 3600000), // 1時間
      },
      cors: {
        origins: getOptionalEnvVar('GFTD_CORS_ORIGINS', 'http://localhost:3000')?.split(',') || [],
        credentials: getBooleanEnvVar('GFTD_CORS_CREDENTIALS', true),
      },
      audit: {
        enabled: getBooleanEnvVar('GFTD_AUDIT_LOG_ENABLED', true),
        logFile: getOptionalEnvVar('GFTD_AUDIT_LOG_FILE', './logs/audit.log') || './logs/audit.log',
      },
      logging: {
        level: getOptionalEnvVar('GFTD_LOG_LEVEL', 'info') || 'info',
      },
    };
  }
  return _securityConfig;
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

/**
 * ストレージ設定 (遅延評価)
 */
export function getStorageConfig(): StorageConfig {
  if (!_storageConfig) {
    _storageConfig = {
      endpoint: getEnvVar('GFTD_STORAGE_ENDPOINT', 'http://localhost:9000'),
      accessKey: getEnvVar('GFTD_STORAGE_ACCESS_KEY', 'minioadmin'),
      secretKey: getEnvVar('GFTD_STORAGE_SECRET_KEY', 'minioadmin'),
      bucket: getEnvVar('GFTD_STORAGE_BUCKET', 'uploads'),
    };
  }
  return _storageConfig;
}

/**
 * OAuth設定 (遅延評価)
 */
export function getOAuthConfig(): OAuthConfig {
  if (!_oauthConfig) {
    _oauthConfig = {
      google: getOptionalEnvVar('GFTD_GOOGLE_CLIENT_ID') && getOptionalEnvVar('GFTD_GOOGLE_CLIENT_SECRET')
        ? {
            clientId: getEnvVar('GFTD_GOOGLE_CLIENT_ID'),
            clientSecret: getEnvVar('GFTD_GOOGLE_CLIENT_SECRET'),
          }
        : undefined,
      github: getOptionalEnvVar('GFTD_GITHUB_CLIENT_ID') && getOptionalEnvVar('GFTD_GITHUB_CLIENT_SECRET')
        ? {
            clientId: getEnvVar('GFTD_GITHUB_CLIENT_ID'),
            clientSecret: getEnvVar('GFTD_GITHUB_CLIENT_SECRET'),
          }
        : undefined,
    };
  }
  return _oauthConfig;
}

// 遅延評価を維持するため、直接的な設定エクスポートは削除
// 各設定は get*Config() 関数を通してアクセスしてください

/**
 * 設定の検証
 */
export function validateConfig(): void {
  const security = getSecurityConfig();
  
  // JWT秘密キーの長さチェック
  if (security.jwt.secret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters long');
  }

  // サポートされているJWTアルゴリズムチェック
  const supportedAlgorithms = ['HS256', 'HS384', 'HS512'];
  if (!supportedAlgorithms.includes(security.jwt.algorithm)) {
    throw new Error(`Unsupported JWT algorithm: ${security.jwt.algorithm}`);
  }

  // bcryptラウンド数の妥当性チェック
  if (security.bcrypt.rounds < 10 || security.bcrypt.rounds > 15) {
    throw new Error('bcrypt rounds must be between 10 and 15');
  }

  // レート制限の妥当性チェック
  if (security.rateLimit.windowMs < 60000) { // 1分未満
    throw new Error('Rate limit window must be at least 60 seconds');
  }

  if (security.rateLimit.maxRequests < 1) {
    throw new Error('Rate limit max requests must be at least 1');
  }
}

/**
 * 設定の初期化
 */
export function initializeConfig(): void {
  try {
    validateConfig();
    console.log('✅ Configuration validated successfully');
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
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