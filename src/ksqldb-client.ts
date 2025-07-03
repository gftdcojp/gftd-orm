/**
 * ksqlDB コネクション - REST API 経由でクエリを実行、DDL／DML を発行
 */

import axios, { AxiosInstance } from 'axios';
import { KsqlDbConfig } from './types';

let ksqlClient: AxiosInstance | null = null;
let config: KsqlDbConfig | null = null;

/**
 * ksqlDB クライアントを初期化
 */
export function initializeKsqlDbClient(ksqlConfig: KsqlDbConfig): void {
  config = ksqlConfig;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/vnd.ksql.v1+json; charset=utf-8',
    ...ksqlConfig.headers,
  };

  // 認証情報がある場合は Authorization ヘッダーを追加
  if (ksqlConfig.apiKey && ksqlConfig.apiSecret) {
    const credentials = Buffer.from(`${ksqlConfig.apiKey}:${ksqlConfig.apiSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  ksqlClient = axios.create({
    baseURL: ksqlConfig.url,
    headers,
    timeout: 30000, // 30秒のタイムアウト
  });
}

/**
 * DDL/DML文を実行（CREATE, INSERT, UPDATE, DELETE, DROP など）
 * /ksql エンドポイントを使用
 */
export async function executeQuery(sql: string): Promise<any> {
  if (!ksqlClient) {
    throw new Error('ksqlDB client is not initialized. Call initializeKsqlDbClient() first.');
  }

  try {
    const response = await ksqlClient.post('/ksql', {
      ksql: sql,
      streamsProperties: {},
    });

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`ksqlDB query failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Pull Query を実行（一度だけ結果を取得するSELECT文）
 * /query-stream エンドポイントを使用
 */
export async function executePullQuery(sql: string): Promise<any> {
  if (!ksqlClient) {
    throw new Error('ksqlDB client is not initialized. Call initializeKsqlDbClient() first.');
  }

  try {
    const response = await ksqlClient.post('/query-stream', {
      sql,
      properties: {},
    }, {
      headers: {
        'Content-Type': 'application/vnd.ksql.v1+json',
        'Accept': 'application/vnd.ksqlapi.delimited.v1',
      },
    });

    // レスポンスを解析
    if (typeof response.data === 'string') {
      const lines = response.data.split('\n').filter((line: string) => line.trim());
      const results = [];
      let header = null;

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (!header && parsed.columnNames) {
            header = parsed;
          } else if (Array.isArray(parsed)) {
            results.push(parsed);
          }
        } catch (parseError) {
          // 無効なJSONをスキップ
        }
      }

      return { header, data: results };
    }

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`ksqlDB pull query failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Push Query を実行（継続的にデータを受信するSELECT文）
 * /query-stream エンドポイントでストリーミング
 */
export async function executePushQuery(
  sql: string,
  onData: (data: any) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): Promise<{ terminate: () => void }> {
  if (!ksqlClient) {
    throw new Error('ksqlDB client is not initialized. Call initializeKsqlDbClient() first.');
  }

  let queryId: string | null = null;
  let terminated = false;

  try {
    // ksqlDB専用のaxiosインスタンスを作成（ストリーミング用）
    const streamClient = axios.create({
      baseURL: config?.url,
      headers: {
        'Content-Type': 'application/vnd.ksql.v1+json',
        'Accept': 'application/vnd.ksqlapi.delimited.v1',
        ...(config?.headers || {}),
      },
      timeout: 0, // ストリーミングの場合はタイムアウトなし
      responseType: 'stream',
    });

    // 認証情報を追加
    if (config?.apiKey && config?.apiSecret) {
      const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
      streamClient.defaults.headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await streamClient.post('/query-stream', {
      sql,
      properties: {},
    });

    let header: any = null;
    let buffer = '';

    response.data.on('data', (chunk: Buffer) => {
      if (terminated) return;

      try {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        
        // 最後の行が不完全な可能性があるので、一つ残しておく
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            // ヘッダー情報を保存
            if (!header && data.columnNames) {
              header = data;
              queryId = data.queryId;
            } else if (Array.isArray(data)) {
              // データ行を処理
              onData({ header, row: data });
            }
          } catch (parseError) {
            // 個別行のパースエラーは無視
            console.warn('Failed to parse line:', line, parseError);
          }
        }
      } catch (error) {
        if (onError && !terminated) {
          onError(new Error(`Failed to process streaming data: ${error}`));
        }
      }
    });

    response.data.on('error', (error: Error) => {
      if (onError && !terminated) {
        onError(error);
      }
    });

    response.data.on('end', () => {
      if (onComplete && !terminated) {
        onComplete();
      }
    });

    // クエリ終了関数を返す
    return {
      terminate: async () => {
        if (terminated) return;
        terminated = true;

        // ストリームを閉じる
        if (response.data && response.data.destroy) {
          response.data.destroy();
        }

        // ksqlDBにクエリ終了を通知
        if (queryId) {
          try {
            await ksqlClient!.post('/close-query', {
              queryId,
            });
          } catch (error) {
            console.warn('Failed to terminate query:', error);
          }
        }
      }
    };

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      // 詳細なエラー情報を取得
      const errorMessage = error.response?.data?.message || 
                          error.response?.statusText || 
                          error.message;
      const statusCode = error.response?.status || 'unknown';
      
      const ksqlError = new Error(`ksqlDB push query failed (${statusCode}): ${errorMessage}`);
      
      if (onError) {
        onError(ksqlError);
      } else {
        throw ksqlError;
      }
    } else {
      if (onError) {
        onError(error as Error);
      } else {
        throw error;
      }
    }

    return { terminate: () => {} };
  }
}

/**
 * SELECT文かどうかを判定
 */
function isSelectStatement(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith('SELECT') || trimmed.startsWith('PRINT');
}

/**
 * 汎用クエリ実行（自動でエンドポイントを選択）
 */
export async function executeAnyQuery(sql: string): Promise<any> {
  const trimmed = sql.trim().toUpperCase();
  
  // SELECT文の場合は /query-stream を使用
  if (isSelectStatement(sql)) {
    // EMIT CHANGES が含まれている場合はプッシュクエリ
    if (trimmed.includes('EMIT CHANGES')) {
      return new Promise((resolve, reject) => {
        const results: any[] = [];
        let header: any = null;

        executePushQuery(
          sql,
          (data) => {
            if (!header) header = data.header;
            results.push(data.row);
          },
          reject,
          () => resolve({ header, data: results })
        );

        // 5秒後に自動終了（デモ用）
        setTimeout(() => {
          resolve({ header, data: results });
        }, 5000);
      });
    } else {
      // プルクエリ
      return executePullQuery(sql);
    }
  } else {
    // DDL/DML文の場合は /ksql を使用
    return executeQuery(sql);
  }
}

/**
 * DDL文を実行（CREATE STREAM/TABLE など）
 */
export async function executeDDL(ddl: string): Promise<any> {
  if (!ksqlClient) {
    throw new Error('ksqlDB client is not initialized. Call initializeKsqlDbClient() first.');
  }

  try {
    const response = await ksqlClient.post('/ksql', {
      ksql: ddl,
      streamsProperties: {},
    });

    if (response.data && response.data[0] && response.data[0].errorMessage) {
      throw new Error(`DDL execution failed: ${response.data[0].errorMessage.message}`);
    }

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`ksqlDB DDL failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * ストリーム/テーブル一覧を取得
 */
export async function listStreams(): Promise<any> {
  return executeQuery('LIST STREAMS;');
}

export async function listTables(): Promise<any> {
  return executeQuery('LIST TABLES;');
}

/**
 * トピック一覧を取得
 */
export async function listTopics(): Promise<any> {
  return executeQuery('LIST TOPICS;');
}

/**
 * スキーマ情報を取得
 */
export async function describeStream(streamName: string): Promise<any> {
  return executeQuery(`DESCRIBE ${streamName};`);
}

export async function describeTable(tableName: string): Promise<any> {
  return executeQuery(`DESCRIBE ${tableName};`);
}

/**
 * クライアント設定を取得
 */
export function getClientConfig(): KsqlDbConfig | null {
  return config;
}

/**
 * 接続状態を確認
 */
export function isConnected(): boolean {
  return ksqlClient !== null && config !== null;
}

/**
 * クライアントを閉じる
 */
export function closeClient(): void {
  ksqlClient = null;
  config = null;
} 