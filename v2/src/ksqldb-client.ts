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
 * クエリを実行
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
 * Pull Query を実行（リアルタイムクエリ用）
 */
export async function executePullQuery(sql: string): Promise<any> {
  if (!ksqlClient) {
    throw new Error('ksqlDB client is not initialized. Call initializeKsqlDbClient() first.');
  }

  try {
    const response = await ksqlClient.post('/query-stream', {
      sql,
      properties: {},
    });

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`ksqlDB pull query failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Push Query を実行（ストリーミングクエリ用）
 */
export async function executePushQuery(
  sql: string,
  onData: (data: any) => void,
  onError?: (error: Error) => void
): Promise<void> {
  if (!ksqlClient) {
    throw new Error('ksqlDB client is not initialized. Call initializeKsqlDbClient() first.');
  }

  try {
    const response = await ksqlClient.post('/query-stream', {
      sql,
      properties: {},
    }, {
      responseType: 'stream',
    });

    response.data.on('data', (chunk: Buffer) => {
      try {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim());
        for (const line of lines) {
          const data = JSON.parse(line);
          onData(data);
        }
      } catch (parseError) {
        if (onError) {
          onError(new Error(`Failed to parse streaming data: ${parseError}`));
        }
      }
    });

    response.data.on('error', (error: Error) => {
      if (onError) {
        onError(error);
      }
    });

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const ksqlError = new Error(`ksqlDB push query failed: ${error.response?.data?.message || error.message}`);
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