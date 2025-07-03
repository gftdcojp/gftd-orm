/**
 * Security Utilities - パスワードハッシュ化、JWT検証、セキュリティ機能
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getSecurityConfig } from './config';

/**
 * パスワード関連の型定義
 */
interface PasswordResult {
  success: boolean;
  hash?: string;
  error?: string;
}

interface PasswordVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * JWT関連の型定義
 */
interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  userId: string;
  exp: number;
  iat: number;
  jti: string;
}

interface JWTVerificationResult {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * パスワードハッシュ化クラス
 */
export class PasswordManager {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;

  /**
   * パスワードの強度チェック
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must be no more than ${this.MAX_LENGTH} characters long`);
    }

    // 大文字を含む
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // 小文字を含む
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // 数字を含む
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // 特殊文字を含む
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * パスワードをハッシュ化
   */
  static async hashPassword(password: string): Promise<PasswordResult> {
    try {
      // パスワード強度チェック
      const validation = this.validatePassword(password);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // bcryptでハッシュ化
      const security = getSecurityConfig();
      const hash = await bcrypt.hash(password, security.bcrypt.rounds);
      
      return {
        success: true,
        hash,
      };
    } catch (error) {
      return {
        success: false,
        error: `Password hashing failed: ${error}`,
      };
    }
  }

  /**
   * パスワードを検証
   */
  static async verifyPassword(password: string, hash: string): Promise<PasswordVerificationResult> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      
      return {
        success: isValid,
        error: isValid ? undefined : 'Invalid password',
      };
    } catch (error) {
      return {
        success: false,
        error: `Password verification failed: ${error}`,
      };
    }
  }

  /**
   * パスワードを生成（ランダム）
   */
  static generateRandomPassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
}

/**
 * JWT管理クラス
 */
export class JWTManager {
  /**
   * JWTトークンを生成
   */
  static generateToken(payload: Omit<JWTPayload, 'exp' | 'iat' | 'jti'>): string {
    const security = getSecurityConfig();
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();
    
    const fullPayload: JWTPayload = {
      ...payload,
      exp: now + this.parseExpiresIn(security.jwt.expiresIn),
      iat: now,
      jti,
    };

    return jwt.sign(fullPayload, security.jwt.secret, {
      algorithm: security.jwt.algorithm as jwt.Algorithm,
    });
  }

  /**
   * JWTトークンを検証
   */
  static verifyToken(token: string): JWTVerificationResult {
    try {
      const security = getSecurityConfig();
      const payload = jwt.verify(token, security.jwt.secret, {
        algorithms: [security.jwt.algorithm as jwt.Algorithm],
      }) as JWTPayload;

      // 追加の検証
      if (!payload.sub || !payload.email || !payload.userId) {
        return {
          success: false,
          error: 'Invalid token payload: missing required fields',
        };
      }

      return {
        success: true,
        payload,
      };
    } catch (error) {
      return {
        success: false,
        error: `Token verification failed: ${error}`,
      };
    }
  }

  /**
   * リフレッシュトークンを生成
   */
  static generateRefreshToken(userId: string): string {
    const security = getSecurityConfig();
    const payload = {
      sub: userId,
      type: 'refresh',
      jti: crypto.randomUUID(),
    };

    return jwt.sign(payload, security.jwt.secret, {
      expiresIn: '7d', // リフレッシュトークンは7日間有効
      algorithm: security.jwt.algorithm as jwt.Algorithm,
    });
  }

  /**
   * リフレッシュトークンを検証
   */
  static verifyRefreshToken(token: string): { success: boolean; userId?: string; error?: string } {
    try {
      const security = getSecurityConfig();
      const payload = jwt.verify(token, security.jwt.secret, {
        algorithms: [security.jwt.algorithm as jwt.Algorithm],
      }) as any;

      if (payload.type !== 'refresh') {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      return {
        success: true,
        userId: payload.sub,
      };
    } catch (error) {
      return {
        success: false,
        error: `Refresh token verification failed: ${error}`,
      };
    }
  }

  /**
   * expiresInを秒数に変換
   */
  private static parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiresIn format: ${expiresIn}`);
    }

    const [, valueStr, unit] = match;
    const value = parseInt(valueStr, 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }
}

/**
 * セキュリティヘルパー
 */
export class SecurityHelper {
  /**
   * セキュアなランダム文字列を生成
   */
  static generateSecureRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * APIキーを生成
   */
  static generateApiKey(): string {
    return `gftd_${this.generateSecureRandomString(32)}`;
  }

  /**
   * CSRFトークンを生成
   */
  static generateCSRFToken(): string {
    return this.generateSecureRandomString(32);
  }

  /**
   * セキュアなIDを生成
   */
  static generateSecureId(prefix: string = ''): string {
    return `${prefix}${crypto.randomUUID()}`;
  }

  /**
   * 文字列をハッシュ化（SHA-256）
   */
  static hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * 時間ベースのワンタイムトークンを生成
   */
  static generateTimeBasedToken(secret: string, window: number = 300): string {
    const time = Math.floor(Date.now() / 1000 / window);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(time.toString());
    return hmac.digest('hex');
  }

  /**
   * 時間ベースのワンタイムトークンを検証
   */
  static verifyTimeBasedToken(token: string, secret: string, window: number = 300): boolean {
    const currentTime = Math.floor(Date.now() / 1000 / window);
    
    // 現在の時間窓と前後の時間窓もチェック（時計のずれを考慮）
    for (let i = -1; i <= 1; i++) {
      const timeWindow = currentTime + i;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(timeWindow.toString());
      const expectedToken = hmac.digest('hex');
      
      if (crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expectedToken, 'hex'))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 入力値のサニタイゼーション
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // HTMLタグを除去
      .replace(/['"]/g, '') // クォートを除去
      .replace(/[;]/g, '') // セミコロンを除去
      .trim();
  }

  /**
   * SQLインジェクション対策のエスケープ
   */
  static escapeSQLString(input: string): string {
    return input.replace(/'/g, "''");
  }

  /**
   * XSS対策のエスケープ
   */
  static escapeHTML(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

/**
 * セッション管理クラス
 */
export class SessionManager {
  private static sessions = new Map<string, any>();

  /**
   * セッションを作成
   */
  static createSession(userId: string, data: any): string {
    const security = getSecurityConfig();
    const sessionId = SecurityHelper.generateSecureId('sess_');
    const session = {
      id: sessionId,
      userId,
      data,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + security.session.timeoutMs),
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * セッションを取得
   */
  static getSession(sessionId: string): any | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // 有効期限チェック
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    // 最終アクセス時刻を更新
    session.lastAccessedAt = new Date();
    
    return session;
  }

  /**
   * セッションを削除
   */
  static deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * 期限切れセッションを削除
   */
  static cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * ユーザーの全セッションを削除
   */
  static deleteUserSessions(userId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
  }
} 