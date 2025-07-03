/**
 * クライアントサイド用HTTPクライアント（ブラウザ環境）
 */

import { isBrowser } from './utils/env';
import { KsqlDbConfig } from './types';

export interface ClientConfig {
  url: string;
  apiKey?: string;
  apiSecret?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * ブラウザ環境用HTTPクライアント
 */
export class HttpClient {
  private config: ClientConfig;
  private defaultHeaders: Record<string, string>;

  constructor(config: ClientConfig) {
    if (!isBrowser()) {
      throw new Error('HttpClient can only be used in browser environment');
    }

    this.config = config;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // 認証情報がある場合は Authorization ヘッダーを追加
    if (config.apiKey && config.apiSecret) {
      const credentials = btoa(`${config.apiKey}:${config.apiSecret}`);
      this.defaultHeaders['Authorization'] = `Basic ${credentials}`;
    }
  }

  /**
   * GET リクエストを送信
   */
  async get(path: string, params?: Record<string, any>): Promise<any> {
    const url = new URL(path, this.config.url);
    
    if (params) {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }

    const response = await this.fetch(url.toString(), {
      method: 'GET',
      headers: this.defaultHeaders,
    });

    return this.handleResponse(response);
  }

  /**
   * POST リクエストを送信
   */
  async post(path: string, data?: any): Promise<any> {
    const url = new URL(path, this.config.url);

    const response = await this.fetch(url.toString(), {
      method: 'POST',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse(response);
  }

  /**
   * PUT リクエストを送信
   */
  async put(path: string, data?: any): Promise<any> {
    const url = new URL(path, this.config.url);

    const response = await this.fetch(url.toString(), {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse(response);
  }

  /**
   * DELETE リクエストを送信
   */
  async delete(path: string): Promise<any> {
    const url = new URL(path, this.config.url);

    const response = await this.fetch(url.toString(), {
      method: 'DELETE',
      headers: this.defaultHeaders,
    });

    return this.handleResponse(response);
  }

  /**
   * ksqlDB クエリを実行
   */
  async executeQuery(sql: string): Promise<any> {
    const response = await this.post('/ksql', {
      ksql: sql,
      streamsProperties: {},
    });

    return response;
  }

  /**
   * Pull Query を実行
   */
  async executePullQuery(sql: string): Promise<any> {
    const response = await this.post('/query-stream', {
      sql,
      properties: {},
    });

    return response;
  }

  private async fetch(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }
}

/**
 * ブラウザ環境用ksqlDBクライアント
 */
export class KsqlDbClientBrowser {
  private httpClient: HttpClient;
  private config: KsqlDbConfig;

  constructor(config: KsqlDbConfig) {
    this.config = config;
    this.httpClient = new HttpClient({
      url: config.url,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      headers: config.headers,
      timeout: 30000,
    });
  }

  /**
   * クエリを実行
   */
  async executeQuery(sql: string): Promise<any> {
    try {
      const response = await this.httpClient.executeQuery(sql);
      return response;
    } catch (error: any) {
      throw new Error(`ksqlDB query failed: ${error.message}`);
    }
  }

  /**
   * Pull Query を実行
   */
  async executePullQuery(sql: string): Promise<any> {
    console.log(`[DEBUG] KsqlDbClientBrowser.executePullQuery - SQL: ${sql}`);
    console.log(`[DEBUG] KsqlDbClientBrowser.executePullQuery - Config:`, this.config);
    
    try {
      const response = await this.httpClient.executePullQuery(sql);
      console.log(`[DEBUG] KsqlDbClientBrowser.executePullQuery - Response:`, response);
      return response;
    } catch (error: any) {
      console.error(`[ERROR] KsqlDbClientBrowser.executePullQuery failed:`, error);
      
      // ストリーム vs テーブルの問題を特定しやすくする
      if (error.message && (error.message.includes('stream') || error.message.includes('table'))) {
        console.error(`[ERROR] KsqlDbClientBrowser.executePullQuery - Possible stream/table issue. SQL: ${sql}`);
        console.error(`[ERROR] KsqlDbClientBrowser.executePullQuery - Remember: Pull queries work only on TABLES, not STREAMS`);
      }
      
      throw new Error(`ksqlDB pull query failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * DDL文を実行
   */
  async executeDDL(ddl: string): Promise<any> {
    try {
      const response = await this.httpClient.executeQuery(ddl);
      
      if (response && response[0] && response[0].errorMessage) {
        throw new Error(`DDL execution failed: ${response[0].errorMessage.message}`);
      }

      return response;
    } catch (error: any) {
      throw new Error(`ksqlDB DDL failed: ${error.message}`);
    }
  }

  /**
   * ストリーム/テーブル一覧を取得
   */
  async listStreams(): Promise<any> {
    return this.executeQuery('LIST STREAMS;');
  }

  async listTables(): Promise<any> {
    return this.executeQuery('LIST TABLES;');
  }

  /**
   * トピック一覧を取得
   */
  async listTopics(): Promise<any> {
    return this.executeQuery('LIST TOPICS;');
  }

  /**
   * スキーマ情報を取得
   */
  async describeStream(streamName: string): Promise<any> {
    return this.executeQuery(`DESCRIBE ${streamName};`);
  }

  async describeTable(tableName: string): Promise<any> {
    return this.executeQuery(`DESCRIBE ${tableName};`);
  }

  /**
   * 接続状態を確認
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.executeQuery('SHOW QUERIES;');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * クライアント設定を取得
   */
  getConfig(): KsqlDbConfig {
    return this.config;
  }
}

/**
 * ブラウザ環境用ksqlDBクライアントを作成
 */
export function createKsqlDbClientBrowser(config: KsqlDbConfig): KsqlDbClientBrowser {
  return new KsqlDbClientBrowser(config);
} 