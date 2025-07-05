/**
 * Auth0統合 - Auth0 JWTトークンとの連携
 */

import jwt from 'jsonwebtoken';
// @ts-ignore
import jwksClient from 'jwks-rsa';
import { UserPayload } from './jwt-auth';
import { log } from './utils/logger';
import { AuditLogManager, AuditEventType, AuditLogLevel } from './audit-log';

/**
 * Auth0設定
 */
interface Auth0Config {
  domain: string;
  audience: string;
  clientId?: string;
  jwksUri?: string;
}

/**
 * Auth0ユーザークレーム
 */
interface Auth0Claims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  nickname?: string;
  'https://your-app.com/roles'?: string[];
  'https://your-app.com/permissions'?: string[];
  'https://your-app.com/tenant_id'?: string;
  [key: string]: any;
}

/**
 * Auth0統合マネージャー
 */
export class Auth0Integration {
  private static instance: Auth0Integration;
  private config: Auth0Config;
  private jwksClient: any;

  private constructor() {
    // デフォルト値を設定
    this.config = {
      domain: process.env.AUTH0_DOMAIN || 'gftd.jp.auth0.com',
      audience: process.env.AUTH0_AUDIENCE || `https://${process.env.AUTH0_DOMAIN || 'gftd.jp.auth0.com'}/api/v2/`,
      clientId: process.env.AUTH0_CLIENT_ID || 'k0ziPQ6IkDxE1AUSvzx5PwXtnf4y81x0',
      jwksUri: process.env.AUTH0_JWKS_URI,
    };

    // JWKS URIが指定されていない場合はドメインから自動生成
    if (!this.config.jwksUri) {
      this.config.jwksUri = `https://${this.config.domain}/.well-known/jwks.json`;
    }

    // JWKSクライアントを初期化
    const jwksUri = this.config.jwksUri || `https://${this.config.domain}/.well-known/jwks.json`;
    this.jwksClient = jwksClient({
      jwksUri,
      requestHeaders: {}, // 必要に応じてヘッダーを追加
      timeout: 30000, // 30秒
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      cacheMaxAge: 24 * 60 * 60 * 1000, // 24時間
    });

    log.info(`Auth0 integration initialized for domain: ${this.config.domain}`);
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(customConfig?: Partial<Auth0Config>): Auth0Integration {
    if (!Auth0Integration.instance) {
      Auth0Integration.instance = new Auth0Integration();
    }
    
    // カスタム設定が渡された場合は設定を更新
    if (customConfig) {
      Auth0Integration.instance.updateConfig(customConfig);
    }
    
    return Auth0Integration.instance;
  }

  /**
   * 設定を更新
   */
  private updateConfig(customConfig: Partial<Auth0Config>): void {
    this.config = {
      ...this.config,
      ...customConfig,
    };

    // JWKS URIを更新
    if (customConfig.domain && !customConfig.jwksUri) {
      this.config.jwksUri = `https://${this.config.domain}/.well-known/jwks.json`;
    }

    // JWKSクライアントを再初期化
    this.jwksClient = jwksClient({
      jwksUri: this.config.jwksUri!,
      requestHeaders: {},
      timeout: 30000,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      cacheMaxAge: 24 * 60 * 60 * 1000,
    });

    log.info(`Auth0 configuration updated for domain: ${this.config.domain}`);
  }

  /**
   * Auth0 JWTトークンを検証
   */
  async verifyAuth0Token(token: string): Promise<Auth0Claims | null> {
    try {
      return new Promise((resolve, reject) => {
        // JWTヘッダーからkidを取得
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || !decoded.header.kid) {
          reject(new Error('Invalid token: missing kid'));
          return;
        }

        // JWKSから署名キーを取得
        this.jwksClient.getSigningKey(decoded.header.kid, (err: any, key: any) => {
          if (err) {
            reject(err);
            return;
          }

          const signingKey = key.getPublicKey();

          // トークンを検証
          jwt.verify(
            token,
            signingKey,
            {
              audience: this.config.audience,
              issuer: `https://${this.config.domain}/`,
              algorithms: ['RS256'],
            },
            (verifyErr, payload) => {
              if (verifyErr) {
                reject(verifyErr);
                return;
              }

              resolve(payload as Auth0Claims);
            }
          );
        });
      });
    } catch (error) {
      log.error(`Auth0 token verification failed: ${error}`);
      return null;
    }
  }

  /**
   * Auth0クレームをGFTD ORMユーザーペイロードに変換
   */
  mapAuth0ToUserPayload(auth0Claims: Auth0Claims): UserPayload {
    // カスタムクレームからロールとテナントIDを取得
    const roles = auth0Claims['https://your-app.com/roles'] || [];
    const permissions = auth0Claims['https://your-app.com/permissions'] || [];
    const tenantId = auth0Claims['https://your-app.com/tenant_id'] || 'default';

    // ロールの決定（最初に見つかったロールを使用）
    let userRole: 'anon' | 'authenticated' | 'service_role' = 'authenticated';
    if (roles.includes('admin') || roles.includes('service_role')) {
      userRole = 'service_role';
    } else if (roles.includes('user') || auth0Claims.email_verified) {
      userRole = 'authenticated';
    }

    const userPayload: UserPayload = {
      sub: auth0Claims.sub,
      email: auth0Claims.email,
      role: userRole,
      tenant_id: tenantId,
      metadata: {
        auth0_user_id: auth0Claims.sub,
        email_verified: auth0Claims.email_verified,
        name: auth0Claims.name,
        picture: auth0Claims.picture,
        nickname: auth0Claims.nickname,
        roles,
        permissions,
      },
      app_metadata: {
        provider: 'auth0',
        domain: this.config.domain,
        client_id: this.config.clientId,
      },
      user_metadata: {
        email: auth0Claims.email,
        name: auth0Claims.name,
        picture: auth0Claims.picture,
      },
    };

    return userPayload;
  }

  /**
   * Auth0トークンからGFTD ORMユーザーを認証
   */
  async authenticateWithAuth0(token: string): Promise<{
    success: boolean;
    user?: UserPayload;
    error?: string;
  }> {
    try {
      // Auth0トークンを検証
      const auth0Claims = await this.verifyAuth0Token(token);
      
      if (!auth0Claims) {
        return {
          success: false,
          error: 'Invalid Auth0 token',
        };
      }

      // GFTD ORMユーザーペイロードに変換
      const user = this.mapAuth0ToUserPayload(auth0Claims);

      // 監査ログ記録
      AuditLogManager.log({
        level: AuditLogLevel.INFO,
        eventType: AuditEventType.AUTH_LOGIN,
        userId: user.sub,
        tenantId: user.tenant_id,
        result: 'SUCCESS',
        message: `Auth0 authentication successful for user ${user.sub}`,
        details: {
          auth0_domain: this.config.domain,
          email: user.email,
          roles: user.metadata?.roles,
        },
      });

      log.info(`Auth0 authentication successful for user: ${user.sub}`);

      return {
        success: true,
        user,
      };
    } catch (error) {
      log.error(`Auth0 authentication failed: ${error}`);
      
      AuditLogManager.log({
        level: AuditLogLevel.ERROR,
        eventType: AuditEventType.AUTH_FAILED,
        result: 'FAILURE',
        message: `Auth0 authentication failed: ${error}`,
        details: { token: token.substring(0, 50) + '...' },
      });

      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Auth0権限をチェック
   */
  checkAuth0Permission(user: UserPayload, permission: string): boolean {
    const permissions = user.metadata?.permissions || [];
    const roles = user.metadata?.roles || [];

    // 管理者は全権限を持つ
    if (roles.includes('admin') || user.role === 'service_role') {
      return true;
    }

    // 特定の権限をチェック
    return permissions.includes(permission);
  }

  /**
   * Auth0ロールをチェック
   */
  checkAuth0Role(user: UserPayload, role: string): boolean {
    const roles = user.metadata?.roles || [];
    return roles.includes(role);
  }

  /**
   * Auth0のManagement APIを使ってユーザー情報を取得
   */
  async getAuth0UserInfo(managementToken: string, userId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://${this.config.domain}/api/v2/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${managementToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Auth0 API error: ${response.status}`);
      }

      const userInfo = await response.json();
      return userInfo;
    } catch (error) {
      log.error(`Failed to get Auth0 user info: ${error}`);
      throw error;
    }
  }

  /**
   * Auth0のManagement APIを使ってユーザーロールを更新
   */
  async updateAuth0UserRoles(
    managementToken: string,
    userId: string,
    roles: string[]
  ): Promise<void> {
    try {
      const response = await fetch(
        `https://${this.config.domain}/api/v2/users/${userId}/roles`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managementToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roles }),
        }
      );

      if (!response.ok) {
        throw new Error(`Auth0 API error: ${response.status}`);
      }

      log.info(`Updated Auth0 user roles for ${userId}: ${roles.join(', ')}`);
    } catch (error) {
      log.error(`Failed to update Auth0 user roles: ${error}`);
      throw error;
    }
  }
}

/**
 * Express.js ミドルウェア: Auth0認証
 */
export function auth0AuthMiddleware(options: {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
} = {}) {
  const auth0Integration = Auth0Integration.getInstance();
  const { requireAuth = true, requiredPermissions = [], requiredRoles = [] } = options;

  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (!requireAuth) {
        return next();
      }

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Auth0 Bearer token required',
      });
    }

    const token = authHeader.substring(7); // "Bearer " を除去

    // Auth0トークンで認証
    const authResult = await auth0Integration.authenticateWithAuth0(token);

    if (!authResult.success || !authResult.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: authResult.error || 'Auth0 authentication failed',
      });
    }

    // 権限チェック
    for (const permission of requiredPermissions) {
      if (!auth0Integration.checkAuth0Permission(authResult.user, permission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Missing required permission: ${permission}`,
        });
      }
    }

    // ロールチェック
    for (const role of requiredRoles) {
      if (!auth0Integration.checkAuth0Role(authResult.user, role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Missing required role: ${role}`,
        });
      }
    }

    // ユーザー情報をリクエストに追加
    req.user = authResult.user;
    req.auth0Token = token;

    next();
  };
}

/**
 * Auth0統合のヘルパー関数
 */
export const auth0 = {
  /**
   * 統合マネージャーのインスタンスを取得
   */
  manager: () => Auth0Integration.getInstance(),

  /**
   * Auth0トークンで認証
   */
  authenticate: async (token: string, customConfig?: Partial<Auth0Config>) => {
    const manager = Auth0Integration.getInstance(customConfig);
    return manager.authenticateWithAuth0(token);
  },

  /**
   * 権限チェック
   */
  checkPermission: (user: UserPayload, permission: string) => {
    const manager = Auth0Integration.getInstance();
    return manager.checkAuth0Permission(user, permission);
  },

  /**
   * ロールチェック
   */
  checkRole: (user: UserPayload, role: string) => {
    const manager = Auth0Integration.getInstance();
    return manager.checkAuth0Role(user, role);
  },

  /**
   * トークン検証
   */
  verifyToken: async (token: string) => {
    const manager = Auth0Integration.getInstance();
    return manager.verifyAuth0Token(token);
  },

  /**
   * ユーザー情報取得
   */
  getUserInfo: async (managementToken: string, userId: string) => {
    const manager = Auth0Integration.getInstance();
    return manager.getAuth0UserInfo(managementToken, userId);
  },
}; 