/**
 * Rate Limiting - レート制限機能
 */

import { securityConfig } from './config';
import { AuditLogManager } from './audit-log';

/**
 * レート制限の設定
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  onLimitReached?: (req: any, res: any) => void;
}

/**
 * レート制限エントリ
 */
interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

/**
 * レート制限マネージャー
 */
export class RateLimitManager {
  private static instance: RateLimitManager;
  private limitMap = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: securityConfig.rateLimit.windowMs,
      maxRequests: securityConfig.rateLimit.maxRequests,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req: any) => req.ip || req.connection.remoteAddress || 'unknown',
      ...config,
    };

    this.startCleanupTimer();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(config?: Partial<RateLimitConfig>): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager(config);
    }
    return RateLimitManager.instance;
  }

  /**
   * レート制限チェック
   */
  checkLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limitMap.get(key);

    if (!entry) {
      // 新しいエントリを作成
      this.limitMap.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }

    // 時間窓をチェック
    const timeDiff = now - entry.firstRequest;
    if (timeDiff >= this.config.windowMs) {
      // 時間窓をリセット
      entry.count = 1;
      entry.firstRequest = now;
      entry.lastRequest = now;

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }

    // リクエスト数をチェック
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.firstRequest + this.config.windowMs,
      };
    }

    // リクエスト数を増加
    entry.count++;
    entry.lastRequest = now;

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.firstRequest + this.config.windowMs,
    };
  }

  /**
   * Express.js ミドルウェアを作成
   */
  static createMiddleware(options?: Partial<RateLimitConfig>) {
    const manager = RateLimitManager.getInstance(options);

    return (req: any, res: any, next: any) => {
      const key = manager.config.keyGenerator!(req);
      const result = manager.checkLimit(key);

      // ヘッダーを設定
      res.setHeader('X-RateLimit-Limit', manager.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (!result.allowed) {
        // レート制限に達した場合
        AuditLogManager.logRateLimitViolation(
          req.ip || req.connection.remoteAddress || 'unknown',
          req.path || req.url || 'unknown',
          req.user?.id
        );

        if (manager.config.onLimitReached) {
          manager.config.onLimitReached(req, res);
        } else {
          res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          });
        }
        return;
      }

      next();
    };
  }

  /**
   * 指定されたキーの制限をリセット
   */
  resetLimit(key: string): void {
    this.limitMap.delete(key);
  }

  /**
   * 全ての制限をリセット
   */
  resetAllLimits(): void {
    this.limitMap.clear();
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalKeys: number;
    activeKeys: number;
    entries: { key: string; count: number; remaining: number }[];
  } {
    const now = Date.now();
    const entries: { key: string; count: number; remaining: number }[] = [];
    let activeKeys = 0;

    for (const [key, entry] of this.limitMap.entries()) {
      const timeDiff = now - entry.firstRequest;
      const isActive = timeDiff < this.config.windowMs;
      
      if (isActive) {
        activeKeys++;
      }

      entries.push({
        key,
        count: entry.count,
        remaining: Math.max(0, this.config.maxRequests - entry.count),
      });
    }

    return {
      totalKeys: this.limitMap.size,
      activeKeys,
      entries,
    };
  }

  /**
   * 期限切れエントリのクリーンアップタイマーを開始
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.windowMs);
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.limitMap.entries()) {
      const timeDiff = now - entry.firstRequest;
      if (timeDiff >= this.config.windowMs) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.limitMap.delete(key));
  }

  /**
   * クリーンアップタイマーを停止
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * スロー制限機能（段階的な制限）
 */
export class SlowDownManager {
  private static instance: SlowDownManager;
  private requestMap = new Map<string, { count: number; firstRequest: number }>();
  private delayMap = new Map<string, number>();

  private constructor(
    private config: {
      windowMs: number;
      delayAfter: number;
      delayMs: number;
      maxDelayMs: number;
    }
  ) {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(config?: {
    windowMs?: number;
    delayAfter?: number;
    delayMs?: number;
    maxDelayMs?: number;
  }): SlowDownManager {
    if (!SlowDownManager.instance) {
      SlowDownManager.instance = new SlowDownManager({
        windowMs: config?.windowMs || securityConfig.rateLimit.windowMs,
        delayAfter: config?.delayAfter || 5,
        delayMs: config?.delayMs || 100,
        maxDelayMs: config?.maxDelayMs || 5000,
      });
    }
    return SlowDownManager.instance;
  }

  /**
   * 遅延時間を計算
   */
  calculateDelay(key: string): number {
    const now = Date.now();
    const entry = this.requestMap.get(key);

    if (!entry) {
      this.requestMap.set(key, { count: 1, firstRequest: now });
      return 0;
    }

    const timeDiff = now - entry.firstRequest;
    if (timeDiff >= this.config.windowMs) {
      // 時間窓をリセット
      this.requestMap.set(key, { count: 1, firstRequest: now });
      return 0;
    }

    entry.count++;

    if (entry.count <= this.config.delayAfter) {
      return 0;
    }

    const excessRequests = entry.count - this.config.delayAfter;
    const delay = Math.min(
      excessRequests * this.config.delayMs,
      this.config.maxDelayMs
    );

    this.delayMap.set(key, delay);
    return delay;
  }

  /**
   * Express.js ミドルウェアを作成
   */
  static createMiddleware(options?: {
    windowMs?: number;
    delayAfter?: number;
    delayMs?: number;
    maxDelayMs?: number;
    keyGenerator?: (req: any) => string;
  }) {
    const manager = SlowDownManager.getInstance(options);
    const keyGenerator = options?.keyGenerator || ((req: any) => req.ip || 'unknown');

    return (req: any, res: any, next: any) => {
      const key = keyGenerator(req);
      const delay = manager.calculateDelay(key);

      if (delay > 0) {
        res.setHeader('X-Retry-After', Math.ceil(delay / 1000));
        
        setTimeout(() => {
          next();
        }, delay);
      } else {
        next();
      }
    };
  }
}

/**
 * 複数のレート制限戦略を組み合わせたミドルウェア
 */
export class CompositeRateLimitManager {
  /**
   * 複数のレート制限を組み合わせたミドルウェアを作成
   */
  static createMiddleware(options: {
    global?: RateLimitConfig;
    perUser?: RateLimitConfig;
    perEndpoint?: RateLimitConfig;
    slowDown?: {
      windowMs?: number;
      delayAfter?: number;
      delayMs?: number;
      maxDelayMs?: number;
    };
  }) {
    const middlewares: any[] = [];

    // グローバルレート制限
    if (options.global) {
      middlewares.push(RateLimitManager.createMiddleware(options.global));
    }

    // ユーザーごとのレート制限
    if (options.perUser) {
      middlewares.push(
        RateLimitManager.createMiddleware({
          ...options.perUser,
          keyGenerator: (req: any) => req.user?.id || req.ip || 'anonymous',
        })
      );
    }

    // エンドポイントごとのレート制限
    if (options.perEndpoint) {
      middlewares.push(
        RateLimitManager.createMiddleware({
          ...options.perEndpoint,
          keyGenerator: (req: any) => `${req.method}:${req.path}:${req.ip || 'unknown'}`,
        })
      );
    }

    // スロー制限
    if (options.slowDown) {
      middlewares.push(SlowDownManager.createMiddleware(options.slowDown));
    }

    return (req: any, res: any, next: any) => {
      let currentIndex = 0;

      const executeNext = () => {
        if (currentIndex >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[currentIndex++];
        middleware(req, res, executeNext);
      };

      executeNext();
    };
  }
}

/**
 * 特定のIPアドレスをブロックするミドルウェア
 */
export class IPBlockManager {
  private static blockedIPs = new Set<string>();
  private static suspiciousIPs = new Map<string, { count: number; firstSeen: number }>();

  /**
   * IPアドレスをブロック
   */
  static blockIP(ip: string): void {
    this.blockedIPs.add(ip);
  }

  /**
   * IPアドレスのブロックを解除
   */
  static unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
  }

  /**
   * 疑わしいIPアドレスを追跡
   */
  static trackSuspiciousIP(ip: string): void {
    const now = Date.now();
    const entry = this.suspiciousIPs.get(ip);

    if (!entry) {
      this.suspiciousIPs.set(ip, { count: 1, firstSeen: now });
    } else {
      entry.count++;
      
      // 一定回数以上の違反でブロック
      if (entry.count >= 10) {
        this.blockIP(ip);
        AuditLogManager.logSecurityViolation(
          undefined,
          undefined,
          'IP_AUTO_BLOCKED',
          { ip, violationCount: entry.count }
        );
      }
    }
  }

  /**
   * IPブロックミドルウェアを作成
   */
  static createMiddleware() {
    return (req: any, res: any, next: any) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      if (this.blockedIPs.has(ip)) {
        AuditLogManager.logSecurityViolation(
          undefined,
          undefined,
          'BLOCKED_IP_ACCESS',
          { ip, userAgent: req.headers['user-agent'] }
        );

        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied',
        });
        return;
      }

      next();
    };
  }

  /**
   * ブロック中のIPアドレス一覧を取得
   */
  static getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  /**
   * 疑わしいIPアドレスの統計を取得
   */
  static getSuspiciousIPs(): { ip: string; count: number; firstSeen: Date }[] {
    return Array.from(this.suspiciousIPs.entries()).map(([ip, entry]) => ({
      ip,
      count: entry.count,
      firstSeen: new Date(entry.firstSeen),
    }));
  }
} 