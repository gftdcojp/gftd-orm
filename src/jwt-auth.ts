/**
 * JWT認証システム - Supabase風のJWT認証実装
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { log } from './utils/logger';
import { AuditLogManager, AuditEventType, AuditLogLevel } from './audit-log';

/**
 * JWT設定
 */
interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

/**
 * ユーザーペイロード
 */
export interface UserPayload {
  sub: string; // ユーザーID
  email?: string;
  role: 'anon' | 'authenticated' | 'service_role';
  tenant_id?: string;
  metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

/**
 * JWT認証結果
 */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserPayload;
  expiresAt: number;
  expiresIn: number;
}

/**
 * JWT認証管理クラス
 */
export class JwtAuthManager {
  private static instance: JwtAuthManager;
  private config: JwtConfig;
  private refreshTokenStore = new Map<string, { userId: string; expiresAt: number }>();

  private constructor() {
    this.config = {
      secret: process.env.GFTD_JWT_SECRET || 'your-super-secret-jwt-key',
      expiresIn: process.env.GFTD_JWT_EXPIRES_IN || '1h',
      refreshExpiresIn: process.env.GFTD_JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: process.env.GFTD_JWT_ISSUER || 'gftd-orm',
      audience: process.env.GFTD_JWT_AUDIENCE || 'gftd-orm-client',
    };
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): JwtAuthManager {
    if (!JwtAuthManager.instance) {
      JwtAuthManager.instance = new JwtAuthManager();
    }
    return JwtAuthManager.instance;
  }

  /**
   * アクセストークンを生成
   */
  generateAccessToken(user: UserPayload): string {
    const payload = {
      sub: user.sub,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      metadata: user.metadata,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      aud: this.config.audience,
      iss: this.config.issuer,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.expiresIn,
    } as jwt.SignOptions);
  }

  /**
   * リフレッシュトークンを生成
   */
  generateRefreshToken(userId: string): string {
    const tokenId = uuidv4();
    const expiresAt = Date.now() + this.parseExpiration(this.config.refreshExpiresIn);

    // リフレッシュトークンを保存
    this.refreshTokenStore.set(tokenId, {
      userId,
      expiresAt,
    });

    return tokenId;
  }

  /**
   * 認証トークンのペアを生成
   */
  generateAuthTokens(user: UserPayload): AuthResult {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user.sub);
    
    const decoded = jwt.decode(accessToken) as any;
    const expiresAt = decoded.exp * 1000; // ミリ秒に変換
    const expiresIn = Math.floor((expiresAt - Date.now()) / 1000);

    log.info(`Generated auth tokens for user: ${user.sub}`);
    AuditLogManager.logAuthSuccess(user.sub, user.tenant_id || 'default', '', '');

    return {
      accessToken,
      refreshToken,
      user,
      expiresAt,
      expiresIn,
    };
  }

  /**
   * アクセストークンを検証
   */
  verifyAccessToken(token: string): UserPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.secret) as any;
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        tenant_id: decoded.tenant_id,
        metadata: decoded.metadata,
        app_metadata: decoded.app_metadata,
        user_metadata: decoded.user_metadata,
      };
    } catch (error) {
      log.warn(`Invalid access token: ${error}`);
      return null;
    }
  }

  /**
   * リフレッシュトークンを検証
   */
  verifyRefreshToken(refreshToken: string): string | null {
    const tokenData = this.refreshTokenStore.get(refreshToken);
    
    if (!tokenData) {
      log.warn(`Invalid refresh token: ${refreshToken}`);
      return null;
    }

    if (Date.now() > tokenData.expiresAt) {
      log.warn(`Expired refresh token: ${refreshToken}`);
      this.refreshTokenStore.delete(refreshToken);
      return null;
    }

    return tokenData.userId;
  }

  /**
   * リフレッシュトークンを使用してアクセストークンを更新
   */
  refreshAccessToken(refreshToken: string, currentUser: UserPayload): AuthResult | null {
    const userId = this.verifyRefreshToken(refreshToken);
    
    if (!userId || userId !== currentUser.sub) {
      AuditLogManager.logAuthFailure(currentUser.email || '', 'Invalid refresh token', '');
      return null;
    }

    // 新しいトークンペアを生成
    const authResult = this.generateAuthTokens(currentUser);
    
    // 古いリフレッシュトークンを削除
    this.refreshTokenStore.delete(refreshToken);

    log.info(`Refreshed access token for user: ${currentUser.sub}`);
    AuditLogManager.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.AUTH_TOKEN_REFRESH,
      userId: currentUser.sub,
      tenantId: currentUser.tenant_id || 'default',
      result: 'SUCCESS',
      message: `Token refreshed for user ${currentUser.sub}`,
    });

    return authResult;
  }

  /**
   * 匿名ユーザーのトークンを生成
   */
  generateAnonymousToken(tenantId?: string): AuthResult {
    const anonUser: UserPayload = {
      sub: `anon-${uuidv4()}`,
      role: 'anon',
      tenant_id: tenantId || 'default',
      metadata: {},
      app_metadata: { provider: 'anonymous' },
      user_metadata: {},
    };

    return this.generateAuthTokens(anonUser);
  }

  /**
   * サービスロールトークンを生成
   */
  generateServiceRoleToken(tenantId?: string): AuthResult {
    const serviceUser: UserPayload = {
      sub: `service-${uuidv4()}`,
      role: 'service_role',
      tenant_id: tenantId || 'default',
      metadata: {},
      app_metadata: { provider: 'service' },
      user_metadata: {},
    };

    return this.generateAuthTokens(serviceUser);
  }

  /**
   * トークンを無効化
   */
  revokeToken(refreshToken: string): void {
    this.refreshTokenStore.delete(refreshToken);
    log.info(`Revoked refresh token: ${refreshToken}`);
  }

  /**
   * 期限切れのリフレッシュトークンをクリーンアップ
   */
  cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [tokenId, tokenData] of this.refreshTokenStore.entries()) {
      if (now > tokenData.expiresAt) {
        this.refreshTokenStore.delete(tokenId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      log.info(`Cleaned up ${cleanedCount} expired refresh tokens`);
    }
  }

  /**
   * 有効期限の文字列をミリ秒に変換
   */
  private parseExpiration(expiration: string): number {
    const units: Record<string, number> = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
    };

    const match = expiration.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    return value * units[unit];
  }
}

/**
 * Express.js ミドルウェア: JWT認証
 */
export function jwtAuthMiddleware(options: {
  requireAuth?: boolean;
  allowAnonymous?: boolean;
  requiredRole?: 'anon' | 'authenticated' | 'service_role';
} = {}) {
  const authManager = JwtAuthManager.getInstance();
  const { requireAuth = true, allowAnonymous = false, requiredRole } = options;

  return (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      if (!requireAuth || allowAnonymous) {
        // 匿名ユーザーとして処理
        req.user = {
          sub: `anon-${uuidv4()}`,
          role: 'anon',
          tenant_id: 'default',
        };
        return next();
      } else {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing authorization header',
        });
      }
    }

    const token = authHeader.replace('Bearer ', '');
    const user = authManager.verifyAccessToken(token);

    if (!user) {
      AuditLogManager.logAuthFailure('', 'Invalid access token', req.ip);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid access token',
      });
    }

    // ロールチェック
    if (requiredRole && user.role !== requiredRole) {
      AuditLogManager.logSecurityViolation(
        user.sub,
        user.tenant_id,
        'INSUFFICIENT_ROLE',
        { required: requiredRole, actual: user.role }
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient role',
      });
    }

    req.user = user;
    next();
  };
}

/**
 * JWT認証のヘルパー関数
 */
export const jwtAuth = {
  /**
   * 認証マネージャーのインスタンスを取得
   */
  manager: () => JwtAuthManager.getInstance(),

  /**
   * ユーザーを認証してトークンを発行
   */
  authenticate: (user: UserPayload) => {
    const authManager = JwtAuthManager.getInstance();
    return authManager.generateAuthTokens(user);
  },

  /**
   * 匿名認証トークンを発行
   */
  authenticateAnonymous: (tenantId?: string) => {
    const authManager = JwtAuthManager.getInstance();
    return authManager.generateAnonymousToken(tenantId);
  },

  /**
   * サービスロール認証トークンを発行
   */
  authenticateServiceRole: (tenantId?: string) => {
    const authManager = JwtAuthManager.getInstance();
    return authManager.generateServiceRoleToken(tenantId);
  },

  /**
   * トークンを検証
   */
  verify: (token: string) => {
    const authManager = JwtAuthManager.getInstance();
    return authManager.verifyAccessToken(token);
  },

  /**
   * トークンをリフレッシュ
   */
  refresh: (refreshToken: string, currentUser: UserPayload) => {
    const authManager = JwtAuthManager.getInstance();
    return authManager.refreshAccessToken(refreshToken, currentUser);
  },

  /**
   * トークンを無効化
   */
  revoke: (refreshToken: string) => {
    const authManager = JwtAuthManager.getInstance();
    authManager.revokeToken(refreshToken);
  },
}; 