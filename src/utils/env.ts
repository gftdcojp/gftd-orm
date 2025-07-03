/**
 * 環境検出ユーティリティ
 */

/**
 * ブラウザ環境かどうかを判定
 */
export function isBrowser(): boolean {
  return typeof globalThis !== 'undefined' && 
         typeof (globalThis as any).window !== 'undefined' && 
         typeof (globalThis as any).document !== 'undefined';
}

/**
 * Node.js環境かどうかを判定
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions && Boolean(process.versions.node);
}

/**
 * Next.js環境かどうかを判定
 */
export function isNextJS(): boolean {
  return typeof process !== 'undefined' && process.env.NEXT_RUNTIME !== undefined;
}

/**
 * サーバーサイド環境かどうかを判定
 */
export function isServerSide(): boolean {
  return !isBrowser() && isNode();
}

/**
 * クライアントサイド環境かどうかを判定
 */
export function isClientSide(): boolean {
  return isBrowser();
}

/**
 * 開発環境かどうかを判定
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 本番環境かどうかを判定
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * 環境情報を取得
 */
export function getEnvironmentInfo() {
  return {
    isBrowser: isBrowser(),
    isNode: isNode(),
    isNextJS: isNextJS(),
    isServerSide: isServerSide(),
    isClientSide: isClientSide(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
  };
} 