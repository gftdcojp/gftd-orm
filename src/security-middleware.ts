/**
 * Security Middleware - 包括的なセキュリティミドルウェア
 */

import helmet from 'helmet';
import cors from 'cors';
import { RateLimitManager, CompositeRateLimitManager, IPBlockManager } from './rate-limit';
import { AuditLogManager, AuditLogLevel, AuditEventType } from './audit-log';
import { createContextFromHeaders } from './context';
import { securityConfig } from './config';
import { SecurityHelper } from './security';

/**
 * セキュリティミドルウェアの設定
 */
interface SecurityMiddlewareConfig {
  helmet?: any;
  cors?: any;
  rateLimit?: {
    global?: boolean;
    perUser?: boolean;
    perEndpoint?: boolean;
    slowDown?: boolean;
  };
  auditLog?: boolean;
  ipBlocking?: boolean;
  csrfProtection?: boolean;
  requestValidation?: boolean;
}

/**
 * セキュリティミドルウェアマネージャー
 */
export class SecurityMiddlewareManager {
  /**
   * 包括的なセキュリティミドルウェアを作成
   */
  static createSecurityMiddleware(config: SecurityMiddlewareConfig = {}) {
    const middlewares: any[] = [];

    // Helmet - セキュリティヘッダー
    if (config.helmet !== false) {
      middlewares.push(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        ...config.helmet,
      }));
    }

    // CORS設定
    if (config.cors !== false) {
      middlewares.push(cors({
        origin: securityConfig.cors.origins,
        credentials: securityConfig.cors.credentials,
        optionsSuccessStatus: 200,
        ...config.cors,
      }));
    }

    // IPブロッキング
    if (config.ipBlocking !== false) {
      middlewares.push(IPBlockManager.createMiddleware());
    }

    // レート制限
    if (config.rateLimit !== false) {
      const rateLimitConfig = config.rateLimit || {};
      
      const enableGlobal = rateLimitConfig.global !== false;
      const enablePerUser = rateLimitConfig.perUser !== false;
      const enablePerEndpoint = rateLimitConfig.perEndpoint !== false;
      const enableSlowDown = rateLimitConfig.slowDown !== false;
      
      if (enableGlobal || enablePerUser || enablePerEndpoint || enableSlowDown) {
        
        middlewares.push(CompositeRateLimitManager.createMiddleware({
          global: rateLimitConfig.global !== false ? {
            windowMs: securityConfig.rateLimit.windowMs,
            maxRequests: securityConfig.rateLimit.maxRequests,
          } : undefined,
          perUser: rateLimitConfig.perUser !== false ? {
            windowMs: securityConfig.rateLimit.windowMs,
            maxRequests: securityConfig.rateLimit.maxRequests * 2, // ユーザーごとは少し緩く
          } : undefined,
          perEndpoint: rateLimitConfig.perEndpoint !== false ? {
            windowMs: securityConfig.rateLimit.windowMs,
            maxRequests: securityConfig.rateLimit.maxRequests / 2, // エンドポイントごとは厳しく
          } : undefined,
          slowDown: rateLimitConfig.slowDown !== false ? {
            windowMs: securityConfig.rateLimit.windowMs,
            delayAfter: 5,
            delayMs: 100,
            maxDelayMs: 5000,
          } : undefined,
        }));
      }
    }

    // リクエスト検証
    if (config.requestValidation !== false) {
      middlewares.push(this.createRequestValidationMiddleware());
    }

    // 監査ログ
    if (config.auditLog !== false && securityConfig.audit.enabled) {
      middlewares.push(this.createAuditLogMiddleware());
    }

    // 認証コンテキスト設定
    middlewares.push(this.createAuthContextMiddleware());

    // CSRFプロテクション
    if (config.csrfProtection !== false) {
      middlewares.push(this.createCSRFProtectionMiddleware());
    }

    return this.combineMiddlewares(middlewares);
  }

  /**
   * リクエスト検証ミドルウェア
   */
  private static createRequestValidationMiddleware() {
    return (req: any, res: any, next: any) => {
      try {
        // Content-Lengthの検証
        const contentLength = parseInt(req.headers['content-length'] || '0');
        if (contentLength > 10 * 1024 * 1024) { // 10MB制限
          AuditLogManager.logSecurityViolation(
            undefined,
            undefined,
            'LARGE_REQUEST_BODY',
            { contentLength, ip: req.ip }
          );
          return res.status(413).json({ error: 'Request too large' });
        }

        // 疑わしいUser-Agentをチェック
        const userAgent = req.headers['user-agent'];
        if (!userAgent || this.isSuspiciousUserAgent(userAgent)) {
          AuditLogManager.logSecurityViolation(
            undefined,
            undefined,
            'SUSPICIOUS_USER_AGENT',
            { userAgent, ip: req.ip }
          );
          IPBlockManager.trackSuspiciousIP(req.ip);
        }

        // ホストヘッダーの検証
        const host = req.headers.host;
        if (host && !this.isAllowedHost(host)) {
          AuditLogManager.logSecurityViolation(
            undefined,
            undefined,
            'INVALID_HOST_HEADER',
            { host, ip: req.ip }
          );
          return res.status(400).json({ error: 'Invalid host header' });
        }

        next();
      } catch (error) {
        AuditLogManager.logSecurityViolation(
          undefined,
          undefined,
          'REQUEST_VALIDATION_ERROR',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        next(error);
      }
    };
  }

  /**
   * 監査ログミドルウェア
   */
  private static createAuditLogMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const requestId = SecurityHelper.generateSecureId('req_');
      
      req.requestId = requestId;

      // レスポンス完了時の処理
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        const duration = Date.now() - startTime;
        
        AuditLogManager.log({
          level: res.statusCode >= 400 ? AuditLogLevel.WARN : AuditLogLevel.INFO,
          eventType: AuditEventType.DATA_READ, // 実際のアクションに応じて変更
          userId: req.user?.id,
          tenantId: req.user?.tenantId,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          resource: req.path,
          action: req.method,
          result: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
          message: `${req.method} ${req.path} - ${res.statusCode}`,
          details: {
            statusCode: res.statusCode,
            duration,
            requestId,
          },
          requestId,
          duration,
        });

        originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * 認証コンテキストミドルウェア
   */
  private static createAuthContextMiddleware() {
    return (req: any, res: any, next: any) => {
      try {
        const context = createContextFromHeaders(req.headers);
        req.user = context;
        next();
      } catch (error) {
        // 認証エラーは許可するが、ログは記録
        AuditLogManager.logSecurityViolation(
          undefined,
          undefined,
          'AUTH_CONTEXT_ERROR',
          { 
            error: error instanceof Error ? error.message : 'Unknown error',
            ip: req.ip,
            path: req.path 
          }
        );
        next();
      }
    };
  }

  /**
   * CSRFプロテクションミドルウェア
   */
  private static createCSRFProtectionMiddleware() {
    return (req: any, res: any, next: any) => {
      // GET, HEAD, OPTIONSリクエストはスキップ
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
      const sessionToken = req.headers['x-session-token'];

      if (!csrfToken || !sessionToken) {
        AuditLogManager.logSecurityViolation(
          req.user?.id,
          req.user?.tenantId,
          'MISSING_CSRF_TOKEN',
          { ip: req.ip, path: req.path }
        );
        return res.status(403).json({ error: 'CSRF token required' });
      }

      // CSRFトークンの検証（実装は簡略化）
      if (!this.verifyCSRFToken(csrfToken, sessionToken)) {
        AuditLogManager.logSecurityViolation(
          req.user?.id,
          req.user?.tenantId,
          'INVALID_CSRF_TOKEN',
          { ip: req.ip, path: req.path }
        );
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      next();
    };
  }

  /**
   * 複数のミドルウェアを組み合わせ
   */
  private static combineMiddlewares(middlewares: any[]) {
    return (req: any, res: any, next: any) => {
      let currentIndex = 0;

      const executeNext = (error?: any) => {
        if (error) {
          return next(error);
        }

        if (currentIndex >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[currentIndex++];
        
        try {
          middleware(req, res, executeNext);
        } catch (error) {
          next(error);
        }
      };

      executeNext();
    };
  }

  /**
   * 疑わしいUser-Agentかチェック
   */
  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /dirbuster/i,
      /burp/i,
      /curl.*bot/i,
      /python.*requests/i,
      /scanner/i,
      /exploit/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * 許可されたホストかチェック
   */
  private static isAllowedHost(host: string): boolean {
    const allowedHosts = [
      'localhost',
      '127.0.0.1',
      ...securityConfig.cors.origins.map(origin => {
        try {
          return new URL(origin).hostname;
        } catch {
          return origin;
        }
      }),
    ];

    const hostname = host.split(':')[0]; // ポート番号を除去
    return allowedHosts.includes(hostname);
  }

  /**
   * CSRFトークンを検証
   */
  private static verifyCSRFToken(csrfToken: string, sessionToken: string): boolean {
    try {
      // 実際の実装では、セッションベースの検証を行う
      // ここでは簡略化した実装
      const expectedToken = SecurityHelper.hashString(sessionToken + 'csrf-secret');
      return csrfToken === expectedToken;
    } catch {
      return false;
    }
  }

  /**
   * CSRFトークンを生成
   */
  static generateCSRFToken(sessionToken: string): string {
    return SecurityHelper.hashString(sessionToken + 'csrf-secret');
  }

  /**
   * セキュリティヘルスチェック
   */
  static getSecurityStatus(): {
    rateLimit: { active: boolean; stats: any };
    ipBlocking: { blockedIPs: string[]; suspiciousIPs: any[] };
    audit: { enabled: boolean };
    cors: { origins: string[] };
  } {
    const rateLimitManager = RateLimitManager.getInstance();
    
    return {
      rateLimit: {
        active: true,
        stats: rateLimitManager.getStatistics(),
      },
      ipBlocking: {
        blockedIPs: IPBlockManager.getBlockedIPs(),
        suspiciousIPs: IPBlockManager.getSuspiciousIPs(),
      },
      audit: {
        enabled: securityConfig.audit.enabled,
      },
      cors: {
        origins: securityConfig.cors.origins,
      },
    };
  }
} 