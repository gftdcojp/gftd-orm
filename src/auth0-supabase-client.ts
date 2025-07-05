/**
 * Auth0対応 Supabase風クライアント
 */

import { auth0 } from './auth0-integration';
import { rls } from './row-level-security';
import { executePullQuery, executePushQuery, PullQueryOptions } from './ksqldb-client';
import { RealtimeClient } from './realtime-client';
import { log } from './utils/logger';
import { AuditLogManager, AuditEventType, AuditLogLevel } from './audit-log';
import { UserPayload } from './jwt-auth';

/**
 * Auth0クライアント設定
 */
export interface Auth0ClientConfig {
  ksqlDbUrl: string;
  auth0Token?: string; // Auth0が発行したJWTトークン
  auth0Config?: {
    domain?: string;
    audience?: string;
    clientId?: string;
    jwksUri?: string;
  };
  options?: {
    realtime?: {
      url?: string;
      autoReconnect?: boolean;
    };
    db?: {
      schema?: string;
    };
  };
}

/**
 * Auth0認証状態
 */
export interface Auth0AuthState {
  user: UserPayload | null;
  isAuthenticated: boolean;
  auth0Token: string | null;
  error: string | null;
}

/**
 * Auth0対応 GFTD ORMクライアント
 */
export class Auth0GftdClient {
  private config: Auth0ClientConfig;
  private authState: Auth0AuthState;
  private realtimeClient?: RealtimeClient;

  constructor(config: Auth0ClientConfig) {
    this.config = config;
    this.authState = {
      user: null,
      isAuthenticated: false,
      auth0Token: config.auth0Token || null,
      error: null,
    };

    // 初期化時にAuth0トークンがあれば認証を試行
    if (config.auth0Token) {
      this.authenticateWithToken(config.auth0Token);
    }
  }

  /**
   * Auth0トークンで認証
   */
  async authenticateWithToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const authResult = await auth0.authenticate(token, this.config.auth0Config);
      
      if (authResult.success && authResult.user) {
        this.authState = {
          user: authResult.user,
          isAuthenticated: true,
          auth0Token: token,
          error: null,
        };

        log.info(`Auth0 client authenticated for user: ${authResult.user.sub}`);
        return { success: true };
      } else {
        this.authState = {
          user: null,
          isAuthenticated: false,
          auth0Token: null,
          error: authResult.error || 'Authentication failed',
        };

        return { 
          success: false, 
          error: authResult.error || 'Authentication failed' 
        };
      }
    } catch (error) {
      const errorMessage = String(error);
      this.authState = {
        user: null,
        isAuthenticated: false,
        auth0Token: null,
        error: errorMessage,
      };

      log.error(`Auth0 authentication failed: ${error}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 認証状態を取得
   */
  get auth(): Auth0AuthState {
    return this.authState;
  }

  /**
   * 新しいAuth0トークンを設定
   */
  async setAuth0Token(token: string): Promise<{ success: boolean; error?: string }> {
    return this.authenticateWithToken(token);
  }

  /**
   * 直接SQLクエリを実行（RLS自動適用）
   */
  async query(sql: string, options?: PullQueryOptions): Promise<{ data: any[]; error: any }> {
    try {
      if (!this.authState.isAuthenticated || !this.authState.user) {
        return {
          data: [],
          error: new Error('Not authenticated with Auth0. Please provide a valid Auth0 token.'),
        };
      }

      // RLSを適用
      const modifiedSQL = rls.applyToQuery(sql, this.authState.user);
      
      log.info(`Executing query for Auth0 user ${this.authState.user.sub}`);
      log.debug(`Original SQL: ${sql}`);
      log.debug(`Modified SQL: ${modifiedSQL}`);

      // クエリを実行
      const result = await executePullQuery(modifiedSQL, options);
      
      // 監査ログ記録
      AuditLogManager.log({
        level: AuditLogLevel.INFO,
        eventType: AuditEventType.DATA_READ,
        userId: this.authState.user.sub,
        tenantId: this.authState.user.tenant_id,
        result: 'SUCCESS',
        message: `Auth0 user query executed successfully`,
        details: { 
          originalSQL: sql,
          modifiedSQL: modifiedSQL,
          auth0_domain: this.authState.user.app_metadata?.domain,
        },
      });

      return {
        data: result.data,
        error: null,
      };
    } catch (error) {
      log.error(`Query execution failed: ${error}`);
      
      if (this.authState.user) {
        AuditLogManager.log({
          level: AuditLogLevel.ERROR,
          eventType: AuditEventType.DATA_READ,
          userId: this.authState.user.sub,
          tenantId: this.authState.user.tenant_id,
          result: 'FAILURE',
          message: `Auth0 user query failed: ${error}`,
          details: { sql, error: String(error) },
        });
      }

      return {
        data: [],
        error: error,
      };
    }
  }

  /**
   * プッシュクエリを実行（ストリーミング、RLS適用）
   */
  async stream(
    sql: string,
    onData: (data: any) => void,
    onError?: (error: Error) => void
  ): Promise<{ terminate: () => void }> {
    if (!this.authState.isAuthenticated || !this.authState.user) {
      throw new Error('Not authenticated with Auth0. Please provide a valid Auth0 token.');
    }

    // RLSを適用
    const modifiedSQL = rls.applyToQuery(sql, this.authState.user);
    
    log.info(`Starting stream for Auth0 user ${this.authState.user.sub}`);
    log.debug(`Stream SQL: ${modifiedSQL}`);

    // 監査ログ記録
    AuditLogManager.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.DATA_READ,
      userId: this.authState.user.sub,
      tenantId: this.authState.user.tenant_id,
      result: 'SUCCESS',
      message: `Auth0 user started streaming query`,
      details: { sql: modifiedSQL },
    });

    return executePushQuery(modifiedSQL, onData, onError);
  }

  /**
   * ユーザーの権限をチェック
   */
  hasPermission(permission: string): boolean {
    if (!this.authState.user) {
      return false;
    }

    return auth0.checkPermission(this.authState.user, permission);
  }

  /**
   * ユーザーのロールをチェック
   */
  hasRole(role: string): boolean {
    if (!this.authState.user) {
      return false;
    }

    return auth0.checkRole(this.authState.user, role);
  }

  /**
   * リアルタイム接続を作成
   */
  createRealtimeClient(options?: { autoReconnect?: boolean }): RealtimeClient {
    if (!this.authState.auth0Token) {
      throw new Error('Auth0 token required for realtime connection');
    }

    if (!this.realtimeClient) {
      const realtimeUrl = this.config.options?.realtime?.url || 
                         this.config.ksqlDbUrl.replace('http', 'ws');
      
      this.realtimeClient = new RealtimeClient({
        url: realtimeUrl,
        apiKey: this.authState.auth0Token,
        autoReconnect: options?.autoReconnect ?? true,
      });
    }

    return this.realtimeClient;
  }

  /**
   * 認証をクリア
   */
  signOut(): void {
    this.authState = {
      user: null,
      isAuthenticated: false,
      auth0Token: null,
      error: null,
    };

    if (this.realtimeClient) {
      this.realtimeClient.disconnect();
      this.realtimeClient = undefined;
    }

    log.info('Auth0 client signed out');
  }

  /**
   * 接続をクリーンアップ
   */
  dispose(): void {
    if (this.realtimeClient) {
      this.realtimeClient.disconnect();
    }
  }
}

/**
 * Auth0対応クライアント作成関数
 */
export function createAuth0Client(
  ksqlDbUrl: string, 
  auth0Token?: string, 
  options?: {
    auth0Config?: {
      domain?: string;
      audience?: string;
      clientId?: string;
      jwksUri?: string;
    };
    realtime?: {
      url?: string;
      autoReconnect?: boolean;
    };
    db?: {
      schema?: string;
    };
  }
): Auth0GftdClient {
  return new Auth0GftdClient({ 
    ksqlDbUrl, 
    auth0Token, 
    auth0Config: options?.auth0Config,
    options: {
      realtime: options?.realtime,
      db: options?.db,
    }
  });
}

/**
 * Express.js用のAuth0ミドルウェア統合ヘルパー
 */
export function createAuth0Middleware(options: {
  requiredPermissions?: string[];
  requiredRoles?: string[];
  auth0Config?: {
    domain?: string;
    audience?: string;
    clientId?: string;
    jwksUri?: string;
  };
} = {}) {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Auth0 Bearer token required',
      });
    }

    const token = authHeader.substring(7);
    
    // Auth0クライアントを作成
    const client = createAuth0Client(process.env.GFTD_DB_URL || '', token, {
      auth0Config: options.auth0Config,
    });
    
    // 認証状態をチェック
    if (!client.auth.isAuthenticated) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: client.auth.error || 'Auth0 authentication failed',
      });
    }

    // 権限チェック
    const { requiredPermissions = [], requiredRoles = [] } = options;
    
    for (const permission of requiredPermissions) {
      if (!client.hasPermission(permission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Missing required permission: ${permission}`,
        });
      }
    }

    for (const role of requiredRoles) {
      if (!client.hasRole(role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Missing required role: ${role}`,
        });
      }
    }

    // リクエストにクライアントとユーザー情報を追加
    req.gftdClient = client;
    req.user = client.auth.user;
    req.auth0Token = token;

    next();
  };
}

/**
 * 使用例
 */
export const auth0Examples = {
  /**
   * フロントエンド（React/Next.js）での使用例
   */
  frontend: () => {
    // React hookの例（TypeScriptコード例）
    /*
    import React from 'react';
    
    const useAuth0GftdClient = (auth0Token: string | null) => {
      const [client, setClient] = React.useState<Auth0GftdClient | null>(null);
      
      React.useEffect(() => {
        if (auth0Token) {
          const gftdClient = createAuth0Client('http://localhost:8088', auth0Token);
          setClient(gftdClient);
        } else {
          setClient(null);
        }
      }, [auth0Token]);

      return client;
    };

    // 使用例
    const MyComponent = () => {
      // const { getAccessTokenSilently } = useAuth0(); // Auth0 Reactフック
      const auth0Token = "..."; // Auth0から取得したトークン
      const gftdClient = useAuth0GftdClient(auth0Token);

      const fetchUserData = async () => {
        if (!gftdClient) return;

        const { data, error } = await gftdClient.query(`
          SELECT id, name, email, created_at 
          FROM user_profiles 
          WHERE status = 'active'
        `);

        if (error) {
          console.error('データ取得エラー:', error);
        } else {
          console.log('ユーザーデータ:', data);
        }
      };

      return { fetchUserData };
    };
    */
  },

  /**
   * バックエンド（Express.js）での使用例
   */
  backend: () => {
    // Express.jsアプリケーション
    const express = require('express');
    const app = express();

    // Auth0ミドルウェアを適用
    app.use('/api/protected', createAuth0Middleware({
      requiredPermissions: ['read:data'],
      requiredRoles: ['user'],
    }));

    // 保護されたエンドポイント
    app.get('/api/protected/users', async (req: any, res: any) => {
      try {
        const { data, error } = await req.gftdClient.query('SELECT * FROM users');
        
        if (error) {
          return res.status(500).json({ error: error.message });
        }

        res.json({ users: data });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // ストリーミングエンドポイント
    app.get('/api/protected/stream', (req: any, res: any) => {
      req.gftdClient.stream(
        'SELECT * FROM user_activity EMIT CHANGES',
        (data: any) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        },
        (error: Error) => {
          res.write(`event: error\ndata: ${error.message}\n\n`);
        }
      );
    });
  },
}; 