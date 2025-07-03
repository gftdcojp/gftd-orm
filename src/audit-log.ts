/**
 * Audit Log System - 監査ログ機能
 */

import fs from 'fs';
import path from 'path';

/**
 * 監査ログレベル
 */
export enum AuditLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

/**
 * 監査ログの種類
 */
export enum AuditEventType {
  // 認証関連
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_TOKEN_REFRESH = 'AUTH_TOKEN_REFRESH',
  
  // データアクセス関連
  DATA_READ = 'DATA_READ',
  DATA_WRITE = 'DATA_WRITE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',
  
  // システム関連
  SYSTEM_START = 'SYSTEM_START',
  SYSTEM_STOP = 'SYSTEM_STOP',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  
  // セキュリティ関連
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  
  // 管理者操作
  ADMIN_USER_CREATE = 'ADMIN_USER_CREATE',
  ADMIN_USER_DELETE = 'ADMIN_USER_DELETE',
  ADMIN_POLICY_CHANGE = 'ADMIN_POLICY_CHANGE',
}

/**
 * 監査ログエントリの型定義
 */
interface AuditLogEntry {
  timestamp: string;
  level: AuditLogLevel;
  eventType: AuditEventType;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result: 'SUCCESS' | 'FAILURE' | 'ERROR';
  message: string;
  details?: Record<string, any>;
  requestId?: string;
  duration?: number;
}

/**
 * 監査ログ設定
 */
interface AuditLogConfig {
  enabled: boolean;
  logFile: string;
  maxFileSize: number;
  maxFiles: number;
  compressRotated: boolean;
}

/**
 * 監査ログマネージャー
 */
export class AuditLogManager {
  private static instance: AuditLogManager;
  private config: AuditLogConfig;
  private logQueue: AuditLogEntry[] = [];
  private isProcessing = false;

  private constructor() {
    // セキュリティ設定（デフォルト値）
    this.config = {
      enabled: process.env.GFTD_AUDIT_ENABLED?.toLowerCase() === 'true' || true,
      logFile: process.env.GFTD_AUDIT_LOG_FILE || './logs/audit.log',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      compressRotated: false,
    };
    
    this.ensureLogDirectory();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): AuditLogManager {
    if (!AuditLogManager.instance) {
      AuditLogManager.instance = new AuditLogManager();
    }
    return AuditLogManager.instance;
  }

  /**
   * 監査ログを記録
   */
  static log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const manager = AuditLogManager.getInstance();
    manager.addLogEntry(entry);
  }

  /**
   * 認証成功ログ
   */
  static logAuthSuccess(userId: string, tenantId: string, sessionId: string, ip?: string): void {
    this.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.AUTH_LOGIN,
      userId,
      tenantId,
      sessionId,
      ip,
      result: 'SUCCESS',
      message: `User ${userId} logged in successfully`,
    });
  }

  /**
   * 認証失敗ログ
   */
  static logAuthFailure(email: string, reason: string, ip?: string): void {
    this.log({
      level: AuditLogLevel.WARN,
      eventType: AuditEventType.AUTH_FAILED,
      ip,
      result: 'FAILURE',
      message: `Authentication failed for ${email}: ${reason}`,
      details: { email, reason },
    });
  }

  /**
   * データアクセスログ
   */
  static logDataAccess(
    userId: string,
    tenantId: string,
    action: 'read' | 'write' | 'delete',
    resource: string,
    success: boolean,
    details?: Record<string, any>
  ): void {
    let eventType: AuditEventType;
    switch (action) {
      case 'read':
        eventType = AuditEventType.DATA_READ;
        break;
      case 'write':
        eventType = AuditEventType.DATA_WRITE;
        break;
      case 'delete':
        eventType = AuditEventType.DATA_DELETE;
        break;
      default:
        eventType = AuditEventType.DATA_READ;
        break;
    }

    this.log({
      level: AuditLogLevel.INFO,
      eventType,
      userId,
      tenantId,
      resource,
      action,
      result: success ? 'SUCCESS' : 'FAILURE',
      message: `${action.toUpperCase()} operation on ${resource} by user ${userId}`,
      details,
    });
  }

  /**
   * セキュリティ違反ログ
   */
  static logSecurityViolation(
    userId: string | undefined,
    tenantId: string | undefined,
    violationType: string,
    details: Record<string, any>,
    ip?: string
  ): void {
    this.log({
      level: AuditLogLevel.SECURITY,
      eventType: AuditEventType.SECURITY_VIOLATION,
      userId,
      tenantId,
      ip,
      result: 'ERROR',
      message: `Security violation detected: ${violationType}`,
      details: { violationType, ...details },
    });
  }

  /**
   * レート制限違反ログ
   */
  static logRateLimitViolation(ip: string, endpoint: string, userId?: string): void {
    this.log({
      level: AuditLogLevel.WARN,
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      userId,
      ip,
      resource: endpoint,
      result: 'ERROR',
      message: `Rate limit exceeded for ${ip} on ${endpoint}`,
      details: { endpoint, ip },
    });
  }

  /**
   * 管理者操作ログ
   */
  static logAdminAction(
    adminUserId: string,
    tenantId: string,
    action: string,
    targetUserId?: string,
    details?: Record<string, any>
  ): void {
    this.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.ADMIN_USER_CREATE, // 動的に変更する必要がある
      userId: adminUserId,
      tenantId,
      result: 'SUCCESS',
      message: `Admin ${adminUserId} performed ${action}`,
      details: { action, targetUserId, ...details },
    });
  }

  /**
   * ログエントリを追加
   */
  private addLogEntry(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    if (!this.config.enabled) {
      return;
    }

    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logQueue.push(logEntry);
    this.processLogQueue();
  }

  /**
   * ログキューを処理
   */
  private async processLogQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.logQueue.length > 0) {
        const entry = this.logQueue.shift();
        if (entry) {
          await this.writeLogEntry(entry);
        }
      }
    } catch (error) {
      console.error('Failed to process audit log queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * ログエントリをファイルに書き込み
   */
  private async writeLogEntry(entry: AuditLogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      
      // ファイルサイズをチェックしてローテーション
      await this.checkAndRotateLog();
      
      // ファイルに書き込み
      await fs.promises.appendFile(this.config.logFile, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write audit log entry:', error);
    }
  }

  /**
   * ログディレクトリが存在することを確認
   */
  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * ログファイルのローテーション
   */
  private async checkAndRotateLog(): Promise<void> {
    try {
      if (!fs.existsSync(this.config.logFile)) {
        return;
      }

      const stats = await fs.promises.stat(this.config.logFile);
      if (stats.size >= this.config.maxFileSize) {
        await this.rotateLogFile();
      }
    } catch (error) {
      console.error('Failed to check log file size:', error);
    }
  }

  /**
   * ログファイルをローテーション
   */
  private async rotateLogFile(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = `${this.config.logFile}.${timestamp}`;
      
      await fs.promises.rename(this.config.logFile, rotatedFile);
      
      // 古いログファイルを削除
      await this.cleanupOldLogFiles();
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * 古いログファイルを削除
   */
  private async cleanupOldLogFiles(): Promise<void> {
    try {
      const logDir = path.dirname(this.config.logFile);
      const logFileName = path.basename(this.config.logFile);
      
      const files = await fs.promises.readdir(logDir);
      const logFiles = files
        .filter(file => file.startsWith(logFileName) && file !== logFileName)
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          stats: fs.statSync(path.join(logDir, file)),
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // 最大ファイル数を超えた古いファイルを削除
      if (logFiles.length > this.config.maxFiles) {
        const filesToDelete = logFiles.slice(this.config.maxFiles);
        for (const file of filesToDelete) {
          await fs.promises.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }

  /**
   * ログを検索
   */
  static async searchLogs(
    criteria: {
      userId?: string;
      tenantId?: string;
      eventType?: AuditEventType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<AuditLogEntry[]> {
    const manager = AuditLogManager.getInstance();
    return manager.searchLogEntries(criteria);
  }

  /**
   * ログエントリを検索
   */
  private async searchLogEntries(criteria: {
    userId?: string;
    tenantId?: string;
    eventType?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      if (!fs.existsSync(this.config.logFile)) {
        return [];
      }

      const content = await fs.promises.readFile(this.config.logFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const entries: AuditLogEntry[] = [];
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditLogEntry;
          
          if (this.matchesCriteria(entry, criteria)) {
            entries.push(entry);
          }
        } catch (error) {
          // 無効なJSONはスキップ
        }
      }

      // 日付でソート（新しい順）
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // 制限を適用
      if (criteria.limit) {
        return entries.slice(0, criteria.limit);
      }

      return entries;
    } catch (error) {
      console.error('Failed to search log entries:', error);
      return [];
    }
  }

  /**
   * ログエントリが検索条件に一致するかチェック
   */
  private matchesCriteria(entry: AuditLogEntry, criteria: any): boolean {
    if (criteria.userId && entry.userId !== criteria.userId) {
      return false;
    }

    if (criteria.tenantId && entry.tenantId !== criteria.tenantId) {
      return false;
    }

    if (criteria.eventType && entry.eventType !== criteria.eventType) {
      return false;
    }

    if (criteria.startDate && new Date(entry.timestamp) < criteria.startDate) {
      return false;
    }

    if (criteria.endDate && new Date(entry.timestamp) > criteria.endDate) {
      return false;
    }

    return true;
  }

  /**
   * 統計情報を取得
   */
  static async getStatistics(
    tenantId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByUser: Record<string, number>;
    securityViolations: number;
  }> {
    const manager = AuditLogManager.getInstance();
    return manager.getLogStatistics(tenantId, startDate, endDate);
  }

  /**
   * ログ統計を取得
   */
  private async getLogStatistics(
    tenantId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByUser: Record<string, number>;
    securityViolations: number;
  }> {
    const entries = await this.searchLogEntries({
      tenantId,
      startDate,
      endDate,
    });

    const stats = {
      totalEvents: entries.length,
      eventsByType: {} as Record<string, number>,
      eventsByUser: {} as Record<string, number>,
      securityViolations: 0,
    };

    for (const entry of entries) {
      // イベントタイプ別集計
      stats.eventsByType[entry.eventType] = (stats.eventsByType[entry.eventType] || 0) + 1;

      // ユーザー別集計
      if (entry.userId) {
        stats.eventsByUser[entry.userId] = (stats.eventsByUser[entry.userId] || 0) + 1;
      }

      // セキュリティ違反数
      if (entry.level === AuditLogLevel.SECURITY) {
        stats.securityViolations++;
      }
    }

    return stats;
  }
} 