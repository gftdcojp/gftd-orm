/**
 * 匿名キーシステム - Supabase風の公開キー管理
 */

import { createHash } from 'crypto';
import { UserPayload, jwtAuth } from './jwt-auth';
import { log } from './utils/logger';
import { AuditLogManager, AuditEventType, AuditLogLevel } from './audit-log';

/**
 * キーの種類
 */
export enum KeyType {
  ANON = 'anon',
  SERVICE_ROLE = 'service_role',
}

/**
 * キー設定
 */
interface KeyConfig {
  key: string;
  type: KeyType;
  permissions: string[];
  description: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

/**
 * 匿名キー管理クラス
 */
export class AnonKeyManager {
  private static instance: AnonKeyManager;
  private keys = new Map<string, KeyConfig>();
  private keyPrefix: string;

  private constructor() {
    this.keyPrefix = process.env.GFTD_KEY_PREFIX || 'gftd';
    this.initializeDefaultKeys();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): AnonKeyManager {
    if (!AnonKeyManager.instance) {
      AnonKeyManager.instance = new AnonKeyManager();
    }
    return AnonKeyManager.instance;
  }

  /**
   * デフォルトキーを初期化
   */
  private initializeDefaultKeys(): void {
    // 匿名キー（公開可能）
    const anonKey = this.generateKey(KeyType.ANON);
    this.keys.set(anonKey, {
      key: anonKey,
      type: KeyType.ANON,
      permissions: [
        'read:public',
        'read:authenticated',
        'write:authenticated',
      ],
      description: 'Public anonymous key for client-side access',
      createdAt: new Date(),
      isActive: true,
    });

    // サービスロールキー（非公開）
    const serviceKey = this.generateKey(KeyType.SERVICE_ROLE);
    this.keys.set(serviceKey, {
      key: serviceKey,
      type: KeyType.SERVICE_ROLE,
      permissions: [
        'read:*',
        'write:*',
        'delete:*',
        'admin:*',
      ],
      description: 'Service role key with full privileges',
      createdAt: new Date(),
      isActive: true,
    });

    log.info('Default keys initialized');
    log.info(`Anonymous key: ${anonKey}`);
    log.info(`Service role key: ${serviceKey}`);
  }

  /**
   * キーを生成
   */
  private generateKey(type: KeyType): string {
    const timestamp = Date.now().toString();
    const randomBytes = Math.random().toString(36).substring(2, 15);
    const hash = createHash('sha256')
      .update(`${this.keyPrefix}-${type}-${timestamp}-${randomBytes}`)
      .digest('hex')
      .substring(0, 32);
    
    return `${this.keyPrefix}_${type}_${hash}`;
  }

  /**
   * キーを検証
   */
  validateKey(key: string): KeyConfig | null {
    const keyConfig = this.keys.get(key);
    
    if (!keyConfig) {
      log.warn(`Invalid key attempted: ${key}`);
      return null;
    }

    if (!keyConfig.isActive) {
      log.warn(`Inactive key attempted: ${key}`);
      return null;
    }

    if (keyConfig.expiresAt && keyConfig.expiresAt < new Date()) {
      log.warn(`Expired key attempted: ${key}`);
      return null;
    }

    return keyConfig;
  }

  /**
   * キーからユーザーペイロードを作成
   */
  createUserFromKey(key: string, userId?: string): UserPayload | null {
    const keyConfig = this.validateKey(key);
    
    if (!keyConfig) {
      return null;
    }

    const userPayload: UserPayload = {
      sub: userId || `${keyConfig.type}-${Date.now()}`,
      role: keyConfig.type === KeyType.ANON ? 'anon' : 'service_role',
      tenant_id: 'default',
      metadata: {
        keyType: keyConfig.type,
        permissions: keyConfig.permissions,
      },
      app_metadata: {
        provider: 'key',
        keyId: key,
      },
      user_metadata: {},
    };

    return userPayload;
  }

  /**
   * キーベースの認証を実行
   */
  authenticateWithKey(key: string, userId?: string): { 
    success: boolean; 
    user?: UserPayload; 
    token?: string; 
    error?: string; 
  } {
    const keyConfig = this.validateKey(key);
    
    if (!keyConfig) {
      AuditLogManager.log({
        level: AuditLogLevel.WARN,
        eventType: AuditEventType.AUTH_FAILED,
        result: 'FAILURE',
        message: `Invalid key authentication attempt: ${key}`,
        details: { key, userId },
      });
      
      return { 
        success: false, 
        error: 'Invalid key' 
      };
    }

    const user = this.createUserFromKey(key, userId);
    if (!user) {
      return { 
        success: false, 
        error: 'Failed to create user from key' 
      };
    }

    // JWTトークンを生成
    const authResult = jwtAuth.authenticate(user);

    AuditLogManager.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.AUTH_LOGIN,
      userId: user.sub,
      result: 'SUCCESS',
      message: `Key-based authentication successful for ${keyConfig.type} key`,
      details: { 
        keyType: keyConfig.type,
        permissions: keyConfig.permissions,
      },
    });

    return {
      success: true,
      user,
      token: authResult.accessToken,
    };
  }

  /**
   * 権限をチェック
   */
  checkPermission(key: string, permission: string): boolean {
    const keyConfig = this.validateKey(key);
    
    if (!keyConfig) {
      return false;
    }

    // ワイルドカード権限をチェック
    if (keyConfig.permissions.includes('*') || 
        keyConfig.permissions.includes(`${permission.split(':')[0]}:*`)) {
      return true;
    }

    // 特定の権限をチェック
    return keyConfig.permissions.includes(permission);
  }

  /**
   * 新しいキーを生成
   */
  createKey(type: KeyType, permissions: string[], description: string, expiresAt?: Date): string {
    const key = this.generateKey(type);
    
    this.keys.set(key, {
      key,
      type,
      permissions,
      description,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
    });

    log.info(`New ${type} key created: ${key}`);
    
    return key;
  }

  /**
   * キーを無効化
   */
  revokeKey(key: string): boolean {
    const keyConfig = this.keys.get(key);
    
    if (!keyConfig) {
      return false;
    }

    keyConfig.isActive = false;
    
    log.info(`Key revoked: ${key}`);
    AuditLogManager.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.ADMIN_POLICY_CHANGE,
      result: 'SUCCESS',
      message: `Key revoked: ${key}`,
      details: { keyType: keyConfig.type },
    });

    return true;
  }

  /**
   * キー一覧を取得
   */
  listKeys(): KeyConfig[] {
    return Array.from(this.keys.values());
  }

  /**
   * 匿名キーを取得
   */
  getAnonKey(): string | null {
    for (const [key, config] of this.keys.entries()) {
      if (config.type === KeyType.ANON && config.isActive) {
        return key;
      }
    }
    return null;
  }

  /**
   * サービスロールキーを取得
   */
  getServiceRoleKey(): string | null {
    for (const [key, config] of this.keys.entries()) {
      if (config.type === KeyType.SERVICE_ROLE && config.isActive) {
        return key;
      }
    }
    return null;
  }

  /**
   * 期限切れキーをクリーンアップ
   */
  cleanupExpiredKeys(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, config] of this.keys.entries()) {
      if (config.expiresAt && config.expiresAt < now) {
        config.isActive = false;
        cleanedCount++;
        
        log.info(`Expired key deactivated: ${key}`);
      }
    }

    if (cleanedCount > 0) {
      log.info(`Cleaned up ${cleanedCount} expired keys`);
    }
  }
}

/**
 * Express.js ミドルウェア: 匿名キー認証
 */
export function anonKeyAuthMiddleware(options: {
  requireAuth?: boolean;
  requiredPermissions?: string[];
} = {}) {
  const keyManager = AnonKeyManager.getInstance();
  const { requireAuth = true, requiredPermissions = [] } = options;

  return (req: any, res: any, next: any) => {
    // Authorization headerまたはAPI keyヘッダーをチェック
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] || req.headers['apikey'];
    
    let key: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // JWT トークンの場合は別のミドルウェアで処理
      return next();
    } else if (apiKey) {
      key = apiKey;
    }

    if (!key) {
      if (!requireAuth) {
        return next();
      }
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      });
    }

    // キーベース認証を実行
    const authResult = keyManager.authenticateWithKey(key);
    
    if (!authResult.success) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: authResult.error,
      });
    }

    // 権限チェック
    for (const permission of requiredPermissions) {
      if (!keyManager.checkPermission(key, permission)) {
        AuditLogManager.log({
          level: AuditLogLevel.WARN,
          eventType: AuditEventType.UNAUTHORIZED_ACCESS,
          userId: authResult.user?.sub,
          result: 'FAILURE',
          message: `Insufficient permissions for ${permission}`,
          details: { key, permission },
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }
    }

    // ユーザー情報をリクエストに追加
    req.user = authResult.user;
    req.apiKey = key;
    
    next();
  };
}

/**
 * 匿名キーシステムのヘルパー関数
 */
export const anonKeySystem = {
  /**
   * マネージャーインスタンスを取得
   */
  manager: () => AnonKeyManager.getInstance(),

  /**
   * 匿名キーで認証
   */
  authenticateAnon: (userId?: string) => {
    const manager = AnonKeyManager.getInstance();
    const anonKey = manager.getAnonKey();
    
    if (!anonKey) {
      return { success: false, error: 'Anonymous key not found' };
    }
    
    return manager.authenticateWithKey(anonKey, userId);
  },

  /**
   * サービスロールキーで認証
   */
  authenticateService: (userId?: string) => {
    const manager = AnonKeyManager.getInstance();
    const serviceKey = manager.getServiceRoleKey();
    
    if (!serviceKey) {
      return { success: false, error: 'Service role key not found' };
    }
    
    return manager.authenticateWithKey(serviceKey, userId);
  },

  /**
   * 権限チェック
   */
  checkPermission: (key: string, permission: string) => {
    const manager = AnonKeyManager.getInstance();
    return manager.checkPermission(key, permission);
  },

  /**
   * 新しいキーを作成
   */
  createKey: (type: KeyType, permissions: string[], description: string, expiresAt?: Date) => {
    const manager = AnonKeyManager.getInstance();
    return manager.createKey(type, permissions, description, expiresAt);
  },

  /**
   * キーを無効化
   */
  revokeKey: (key: string) => {
    const manager = AnonKeyManager.getInstance();
    return manager.revokeKey(key);
  },

  /**
   * 公開キーを取得
   */
  getPublicKeys: () => {
    const manager = AnonKeyManager.getInstance();
    return {
      anonKey: manager.getAnonKey(),
      // サービスロールキーは公開しない
    };
  },
}; 