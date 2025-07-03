import winston from 'winston';

/**
 * @fileoverview 統一されたログ機能
 * @description プロジェクト全体で使用する統一されたログ機能を提供します
 */

// ログレベル設定
const logLevel = process.env.GFTD_LOG_LEVEL || process.env.LOG_LEVEL || 'info';

// ログフォーマット設定
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `[${timestamp}] [${level}] ${message}\n${stack}`;
    }
    return `[${timestamp}] [${level}] ${message}`;
  })
);

// ログトランスポート設定
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: logFormat,
    level: logLevel
  })
];

// ファイルログ設定（本番環境用）
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

// Winstonロガー作成
const winstonLogger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  exitOnError: false
});

/**
 * アプリケーション全体で使用する統一されたログ機能
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    this.logger = winstonLogger;
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * デバッグログ
   * @param message ログメッセージ
   * @param meta 追加メタデータ
   */
  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * 情報ログ
   * @param message ログメッセージ
   * @param meta 追加メタデータ
   */
  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * 警告ログ
   * @param message ログメッセージ
   * @param meta 追加メタデータ
   */
  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * エラーログ
   * @param message ログメッセージ
   * @param error エラーオブジェクト
   * @param meta 追加メタデータ
   */
  public error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, { ...meta, error: error.message, stack: error.stack });
    } else {
      this.logger.error(message, { ...meta, error });
    }
  }

  /**
   * 成功ログ (info level)
   * @param message ログメッセージ
   * @param meta 追加メタデータ
   */
  public success(message: string, meta?: any): void {
    this.logger.info(`✅ ${message}`, meta);
  }

  /**
   * 失敗ログ (error level)
   * @param message ログメッセージ
   * @param error エラーオブジェクト
   * @param meta 追加メタデータ
   */
  public failure(message: string, error?: Error | any, meta?: any): void {
    this.error(`❌ ${message}`, error, meta);
  }
}

// デフォルトのログ機能をエクスポート
export const log = Logger.getInstance();

// 従来のコンソールログ代替機能
export const consoleLogger = {
  debug: (message: string, ...args: any[]) => log.debug(message, { args }),
  info: (message: string, ...args: any[]) => log.info(message, { args }),
  warn: (message: string, ...args: any[]) => log.warn(message, { args }),
  error: (message: string, ...args: any[]) => log.error(message, args[0], { args: args.slice(1) }),
  log: (message: string, ...args: any[]) => log.info(message, { args }),
  success: (message: string, ...args: any[]) => log.success(message, { args }),
  failure: (message: string, error?: Error | any, ...args: any[]) => log.failure(message, error, { args })
}; 