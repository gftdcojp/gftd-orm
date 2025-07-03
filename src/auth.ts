/**
 * Auth Module - 認証・認可機能
 */

import jwt from 'jsonwebtoken';
import { PasswordManager, JWTManager, SessionManager } from './security';
import { AuditLogManager } from './audit-log';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn?: string;
  allowAnonymous?: boolean;
  providers?: {
    google?: {
      clientId: string;
      clientSecret: string;
    };
    github?: {
      clientId: string;
      clientSecret: string;
    };
    email?: {
      enabled: boolean;
      requireConfirmation?: boolean;
    };
  };
}

export interface User {
  id: string;
  email: string;
  username?: string;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  raw_app_meta_data?: Record<string, any>;
  raw_user_meta_data?: Record<string, any>;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  role?: string;
  aud?: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  phone?: string;
  phone_confirmed_at?: string;
}

export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: User;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
    redirectTo?: string;
    captchaToken?: string;
  };
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error?: any;
}

export interface AuthError {
  message: string;
  status?: number;
}

/**
 * Auth クラス - 認証・認可管理
 */
export class Auth {
  private initialized = false;
  private currentSession: Session | null = null;

  constructor(private config: AuthConfig) {}

  /**
   * 認証システムを初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('Initializing auth system...');
    this.initialized = true;
  }

  /**
   * ユーザー登録
   */
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 実際の実装では認証プロバイダー（Auth0、Firebase Auth等）のAPIを呼び出し
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: credentials.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_app_meta_data: {},
        raw_user_meta_data: credentials.options?.data || {},
        app_metadata: {},
        user_metadata: credentials.options?.data || {},
      };

      const session = this.createSession(user);
      this.currentSession = session;

      return {
        data: {
          user,
          session,
        },
      };
    } catch (error) {
      return {
        data: { user: null, session: null },
        error: { message: 'Failed to sign up', status: 400 },
      };
    }
  }

  /**
   * ユーザーログイン
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 実際の実装では認証プロバイダーのAPIを呼び出し
      const user: User = {
        id: `user_existing_${Math.random().toString(36).substr(2, 9)}`,
        email: credentials.email,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1日前
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        raw_app_meta_data: {},
        raw_user_meta_data: {},
        app_metadata: {},
        user_metadata: {},
      };

      const session = this.createSession(user);
      this.currentSession = session;

      return {
        data: {
          user,
          session,
        },
      };
    } catch (error) {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', status: 401 },
      };
    }
  }

  /**
   * OAuth プロバイダーでサインイン
   */
  async signInWithOAuth(provider: 'google' | 'github'): Promise<AuthResponse> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.config.providers?.[provider]) {
        throw new Error(`Provider ${provider} not configured`);
      }

      // 実際の実装ではOAuthフローの開始
      // ここではモックの実装
      const user: User = {
        id: `user_oauth_${provider}_${Math.random().toString(36).substr(2, 9)}`,
        email: `user@${provider}.com`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        raw_app_meta_data: { provider },
        raw_user_meta_data: {},
        app_metadata: { provider },
        user_metadata: {},
      };

      const session = this.createSession(user);
      this.currentSession = session;

      return {
        data: {
          user,
          session,
        },
      };
    } catch (error) {
      return {
        data: { user: null, session: null },
        error: { message: `OAuth sign in failed for ${provider}`, status: 400 },
      };
    }
  }

  /**
   * ログアウト
   */
  async signOut(): Promise<{ error?: any }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 実際の実装ではトークンの無効化等
      this.currentSession = null;

      return {};
    } catch (error) {
      return { error: { message: 'Sign out failed', status: 500 } };
    }
  }

  /**
   * パスワード変更
   */
  async updatePassword(password: string): Promise<{ data?: User; error?: any }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.currentSession) {
        throw new Error('Not authenticated');
      }

      // 実際の実装ではパスワード更新API呼び出し
      const updatedUser: User = {
        ...this.currentSession.user,
        updated_at: new Date().toISOString(),
      };

      this.currentSession.user = updatedUser;

      return { data: updatedUser };
    } catch (error) {
      return { error: { message: 'Failed to update password', status: 400 } };
    }
  }

  /**
   * ユーザーメタデータ更新
   */
  async updateUser(attributes: Partial<User>): Promise<{ data?: User; error?: any }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.currentSession) {
        throw new Error('Not authenticated');
      }

      // 実際の実装ではユーザー更新API呼び出し
      const updatedUser: User = {
        ...this.currentSession.user,
        ...attributes,
        updated_at: new Date().toISOString(),
      };

      this.currentSession.user = updatedUser;

      return { data: updatedUser };
    } catch (error) {
      return { error: { message: 'Failed to update user', status: 400 } };
    }
  }

  /**
   * パスワードリセット
   */
  async resetPasswordForEmail(email: string): Promise<{ data?: any; error?: any }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 実際の実装ではパスワードリセットメール送信
      return { data: { message: 'Password reset email sent' } };
    } catch (error) {
      return { error: { message: 'Failed to send reset email', status: 400 } };
    }
  }

  /**
   * 現在のユーザーを取得
   */
  getUser(): User | null {
    return this.currentSession?.user || null;
  }

  /**
   * 現在のセッションを取得
   */
  getSession(): Session | null {
    return this.currentSession;
  }

  /**
   * トークンを検証
   */
  async verifyToken(token: string): Promise<{ valid: boolean; payload?: any; error?: any }> {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret);
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: { message: 'Invalid token' } };
    }
  }

  /**
   * 認証状態変更を監視
   */
  onAuthStateChange(callback: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', session: Session | null) => void): () => void {
    // 実際の実装ではイベントリスナーを登録
    // ここではモックの実装
    const intervalId = setInterval(() => {
      // セッション状態をチェック
      if (this.currentSession) {
        callback('TOKEN_REFRESHED', this.currentSession);
      }
    }, 60000); // 1分ごと

    // クリーンアップ関数を返す
    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * Admin API - ユーザー管理（管理者のみ）
   */
  admin = {
    /**
     * ユーザー一覧を取得
     */
    listUsers: async (options?: { page?: number; perPage?: number }): Promise<{ data: User[]; error?: any }> => {
      try {
        if (!this.initialized) {
          await this.initialize();
        }

        // 実際の実装では管理者API呼び出し
        const users: User[] = [
          {
            id: 'admin_user_1',
            email: 'admin@example.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            role: 'admin',
          },
        ];

        return { data: users };
      } catch (error) {
        return { data: [], error };
      }
    },

    /**
     * ユーザーを作成
     */
    createUser: async (attributes: Partial<User>): Promise<{ data?: User; error?: any }> => {
      try {
        if (!this.initialized) {
          await this.initialize();
        }

        // 実際の実装では管理者API呼び出し
        const user: User = {
          id: `admin_created_${Date.now()}`,
          email: attributes.email || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...attributes,
        };

        return { data: user };
      } catch (error) {
        return { error: { message: 'Failed to create user', status: 400 } };
      }
    },

    /**
     * ユーザーを削除
     */
    deleteUser: async (userId: string): Promise<{ data?: any; error?: any }> => {
      try {
        if (!this.initialized) {
          await this.initialize();
        }

        // 実際の実装では管理者API呼び出し
        return { data: { message: `User ${userId} deleted` } };
      } catch (error) {
        return { error: { message: 'Failed to delete user', status: 400 } };
      }
    },
  };

  /**
   * セッションを作成
   */
  private createSession(user: User): Session {
    const expiresIn = 3600; // 1時間
    const expiresAt = Date.now() + expiresIn * 1000;

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role || 'authenticated',
        aud: user.aud || 'authenticated',
        exp: Math.floor(expiresAt / 1000),
        iat: Math.floor(Date.now() / 1000),
      },
      this.config.jwtSecret
    );

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        type: 'refresh',
        exp: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000), // 7日
      },
      this.config.jwtSecret
    );

    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      expires_at: expiresAt,
      refresh_token: refreshToken,
      user,
    };
  }
}

/**
 * デフォルトAuthインスタンスを作成
 */
export function createAuth(config: AuthConfig): Auth {
  return new Auth(config);
} 