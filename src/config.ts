/**
 * Configuration Management - 環境変数とセキュリティ設定
 */

import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

/**
 * 環境変数の型定義
 */
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
    endpoint: string;
    key?: string;
    secret?: string;
  };
  schemaRegistry: {
    url: string;
    user?: string;
    pass?: string;
  };
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

/**
 * セキュリティ設定
 */
export const securityConfig: SecurityConfig = {
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

/**
 * データベース設定
 */
export const databaseConfig: DatabaseConfig = {
  ksql: {
    endpoint: getEnvVar('GFTD_KSQLDB_ENDPOINT'),
    key: getOptionalEnvVar('GFTD_KSQLDB_KEY'),
    secret: getOptionalEnvVar('GFTD_KSQLDB_SECRET'),
  },
  schemaRegistry: {
    url: getEnvVar('GFTD_SCHEMA_REGISTRY_URL'),
    user: getOptionalEnvVar('GFTD_SCHEMA_REGISTRY_USER'),
    pass: getOptionalEnvVar('GFTD_SCHEMA_REGISTRY_PASS'),
  },
};

/**
 * ストレージ設定
 */
export const storageConfig: StorageConfig = {
  endpoint: getEnvVar('GFTD_STORAGE_ENDPOINT'),
  accessKey: getEnvVar('GFTD_STORAGE_ACCESS_KEY'),
  secretKey: getEnvVar('GFTD_STORAGE_SECRET_KEY'),
  bucket: getEnvVar('GFTD_STORAGE_BUCKET'),
};

/**
 * OAuth設定
 */
export const oauthConfig: OAuthConfig = {
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

/**
 * 設定の検証
 */
export function validateConfig(): void {
  // JWT秘密キーの長さチェック
  if (securityConfig.jwt.secret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters long');
  }

  // サポートされているJWTアルゴリズムチェック
  const supportedAlgorithms = ['HS256', 'HS384', 'HS512'];
  if (!supportedAlgorithms.includes(securityConfig.jwt.algorithm)) {
    throw new Error(`Unsupported JWT algorithm: ${securityConfig.jwt.algorithm}`);
  }

  // bcryptラウンド数の妥当性チェック
  if (securityConfig.bcrypt.rounds < 10 || securityConfig.bcrypt.rounds > 15) {
    throw new Error('bcrypt rounds must be between 10 and 15');
  }

  // レート制限の妥当性チェック
  if (securityConfig.rateLimit.windowMs < 60000) { // 1分未満
    throw new Error('Rate limit window must be at least 60 seconds');
  }

  if (securityConfig.rateLimit.maxRequests < 1) {
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