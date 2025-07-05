/**
 * Supabase風クライアント - 匿名キーベースの統合クライアント
 */

import { UserPayload, jwtAuth, AuthResult } from './jwt-auth';
import { anonKeySystem, KeyType } from './anon-key-system';
import { rls } from './row-level-security';
import { executePullQuery, executePushQuery, PullQueryOptions } from './ksqldb-client';
import { RealtimeClient } from './realtime-client';
import { log } from './utils/logger';
import { AuditLogManager, AuditEventType, AuditLogLevel } from './audit-log';

/**
 * クライアント設定
 */
export interface GftdClientConfig {
  url: string;
  key: string; // 匿名キーまたはサービスロールキー
  options?: {
    realtime?: {
      url?: string;
      autoReconnect?: boolean;
    };
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
    };
    db?: {
      schema?: string;
    };
  };
}

/**
 * 認証状態
 */
export interface AuthState {
  user: UserPayload | null;
  session: AuthResult | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

/**
 * Supabase風GFTD ORMクライアント
 */
export class GftdClient {
  private config: GftdClientConfig;
  private authState: AuthState;
  private realtimeClient?: RealtimeClient;
  private tokenRefreshInterval?: NodeJS.Timeout;

  constructor(config: GftdClientConfig) {
    this.config = config;
    this.authState = {
      user: null,
      session: null,
      isAuthenticated: false,
      isAnonymous: true,
    };

    this.initializeClient();
  }

  /**
   * クライアントを初期化
   */
  private async initializeClient(): Promise<void> {
    try {
      // 匿名キーで認証
      const authResult = anonKeySystem.manager().authenticateWithKey(this.config.key);
      
      if (authResult.success && authResult.user && authResult.token) {
        this.authState = {
          user: authResult.user,
          session: {
            accessToken: authResult.token,
            refreshToken: '',
            user: authResult.user,
            expiresAt: Date.now() + (60 * 60 * 1000), // 1時間
            expiresIn: 3600,
          },
          isAuthenticated: true,
          isAnonymous: authResult.user.role === 'anon',
        };

        log.info(`GFTD client initialized with ${authResult.user.role} role`);
      } else {
        throw new Error('Failed to authenticate with provided key');
      }
    } catch (error) {
      log.error(`Client initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * 認証状態を取得
   */
  get auth(): AuthState {
    return this.authState;
  }

  /**
   * 直接SQLクエリを実行
   */
  async query(sql: string, options?: PullQueryOptions): Promise<{ data: any[]; error: any }> {
    try {
      if (!this.authState.user) {
        throw new Error('Not authenticated');
      }

      // RLSを適用
      const modifiedSQL = rls.applyToQuery(sql, this.authState.user);
      
      // クエリを実行
      const result = await executePullQuery(modifiedSQL, options);
      
      AuditLogManager.log({
        level: AuditLogLevel.INFO,
        eventType: AuditEventType.DATA_READ,
        userId: this.authState.user.sub,
        tenantId: this.authState.user.tenant_id,
        result: 'SUCCESS',
        message: `Query executed successfully`,
        details: { sql: modifiedSQL },
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
          message: `Query execution failed: ${error}`,
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
   * プッシュクエリを実行（ストリーミング）
   */
  async stream(
    sql: string,
    onData: (data: any) => void,
    onError?: (error: Error) => void
  ): Promise<{ terminate: () => void }> {
    if (!this.authState.user) {
      throw new Error('Not authenticated');
    }

    // RLSを適用
    const modifiedSQL = rls.applyToQuery(sql, this.authState.user);
    
    return executePushQuery(modifiedSQL, onData, onError);
  }

  /**
   * 接続をクリーンアップ
   */
  dispose(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    if (this.realtimeClient) {
      this.realtimeClient.disconnect();
    }
  }
}

/**
 * Supabase風クライアント作成関数
 */
export function createClient(url: string, key: string, options?: GftdClientConfig['options']): GftdClient {
  return new GftdClient({ url, key, options });
}

/**
 * 匿名キーとサービスロールキーを取得
 */
export function getKeys(): { anonKey: string | null; serviceRoleKey: string | null } {
  const manager = anonKeySystem.manager();
  return {
    anonKey: manager.getAnonKey(),
    serviceRoleKey: manager.getServiceRoleKey(),
  };
} 