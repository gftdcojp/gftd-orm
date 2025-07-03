/**
 * クライアントサイド用Database Module
 */

import { isClientSide } from './utils/env';
import { KsqlDbConfig, SchemaRegistryConfig } from './types';
import { KsqlDbClientBrowser } from './http-client';

export interface DatabaseClientConfig {
  ksql: KsqlDbConfig;
  schemaRegistry: SchemaRegistryConfig;
}

/**
 * クライアントサイド用Database クラス
 */
export class DatabaseClient {
  private ksqlClient: KsqlDbClientBrowser;
  private initialized = false;

  constructor(private config: DatabaseClientConfig) {
    if (!isClientSide()) {
      throw new Error('DatabaseClient can only be used in browser environment');
    }
    
    this.ksqlClient = new KsqlDbClientBrowser(config.ksql);
  }

  /**
   * データベースを初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // クライアントサイドでの初期化処理
    this.initialized = true;
  }

  /**
   * テーブルからデータを取得（Supabaseライク）
   */
  from<T = any>(table: string): DatabaseClientQueryBuilder<T> {
    return new DatabaseClientQueryBuilder<T>(table, this.ksqlClient);
  }

  /**
   * SQL文を直接実行
   */
  async sql(query: string, params?: any[]): Promise<any> {
    return this.ksqlClient.executeQuery(query);
  }

  /**
   * ヘルスチェック
   */
  async health(): Promise<{ status: 'ok' | 'error'; details?: any }> {
    try {
      const connected = await this.ksqlClient.isConnected();
      return { status: connected ? 'ok' : 'error', details: { connected } };
    } catch (error) {
      return { status: 'error', details: error };
    }
  }
}

/**
 * クライアントサイド用クエリビルダー
 */
export class DatabaseClientQueryBuilder<T = any> {
  protected selectFields: string[] = ['*'];
  protected whereConditions: any = {};
  protected orderByConditions: any = {};
  protected limitValue?: number;
  protected offsetValue?: number;

  constructor(
    protected tableName: string,
    protected ksqlClient: KsqlDbClientBrowser
  ) {}

  /**
   * 選択するフィールドを指定
   */
  select(fields: string = '*'): this {
    this.selectFields = fields === '*' ? ['*'] : fields.split(',').map(f => f.trim());
    return this;
  }

  /**
   * WHERE条件を追加
   */
  eq(column: string, value: any): this {
    this.whereConditions[column] = value;
    return this;
  }

  /**
   * LIKE条件を追加
   */
  like(column: string, pattern: string): this {
    this.whereConditions[column] = { like: pattern };
    return this;
  }

  /**
   * 範囲条件を追加
   */
  gte(column: string, value: any): this {
    this.whereConditions[column] = { gte: value };
    return this;
  }

  lte(column: string, value: any): this {
    this.whereConditions[column] = { lte: value };
    return this;
  }

  gt(column: string, value: any): this {
    this.whereConditions[column] = { gt: value };
    return this;
  }

  lt(column: string, value: any): this {
    this.whereConditions[column] = { lt: value };
    return this;
  }

  /**
   * IN条件を追加
   */
  in(column: string, values: any[]): this {
    this.whereConditions[column] = { in: values };
    return this;
  }

  /**
   * ORDER BY を追加
   */
  order(column: string, ascending: boolean = true): this {
    this.orderByConditions[column] = ascending ? 'asc' : 'desc';
    return this;
  }

  /**
   * LIMIT を設定
   */
  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  /**
   * OFFSET を設定
   */
  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  /**
   * クエリを実行してデータを取得
   */
  async execute(): Promise<{ data: T[]; error?: any }> {
    try {
      const query = this.buildSelectQuery();
      const result = await this.ksqlClient.executeQuery(query);
      
      // 結果をパース（実際の実装では適切にパース）
      const data = result?.rows || [];
      
      return { data };
    } catch (error) {
      return { data: [], error };
    }
  }

  /**
   * 単一レコードを取得
   */
  async single(): Promise<{ data: T | null; error?: any }> {
    const result = await this.limit(1).execute();
    return {
      data: result.data.length > 0 ? result.data[0] : null,
      error: result.error
    };
  }

  /**
   * データを挿入（Supabaseライク）
   */
  async insert(values: Partial<T>): Promise<{ data: T | null; error?: any }> {
    try {
      const query = this.buildInsertQuery(values);
      await this.ksqlClient.executeQuery(query);
      
      return { data: values as T };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * データを更新（Supabaseライク）
   */
  async update(values: Partial<T>): Promise<{ data: T[]; error?: any }> {
    try {
      const query = this.buildUpdateQuery(values);
      await this.ksqlClient.executeQuery(query);
      
      return { data: [values as T] };
    } catch (error) {
      return { data: [], error };
    }
  }

  /**
   * データを削除（Supabaseライク）
   */
  async delete(): Promise<{ data: any; error?: any }> {
    try {
      const query = this.buildDeleteQuery();
      await this.ksqlClient.executeQuery(query);
      
      return { data: { deleted: true } };
    } catch (error) {
      return { data: null, error };
    }
  }

  private buildSelectQuery(): string {
    let query = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    
    if (Object.keys(this.whereConditions).length > 0) {
      const whereClause = Object.entries(this.whereConditions)
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            const obj = value as any;
            if (obj.like) return `${key} LIKE '${obj.like}'`;
            if (obj.gte) return `${key} >= ${obj.gte}`;
            if (obj.lte) return `${key} <= ${obj.lte}`;
            if (obj.gt) return `${key} > ${obj.gt}`;
            if (obj.lt) return `${key} < ${obj.lt}`;
            if (obj.in) return `${key} IN (${obj.in.map((v: any) => `'${v}'`).join(', ')})`;
          }
          return `${key} = '${value}'`;
        })
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
    }
    
    if (Object.keys(this.orderByConditions).length > 0) {
      const orderClause = Object.entries(this.orderByConditions)
        .map(([key, direction]) => `${key} ${direction}`)
        .join(', ');
      
      query += ` ORDER BY ${orderClause}`;
    }
    
    if (this.limitValue) {
      query += ` LIMIT ${this.limitValue}`;
    }
    
    if (this.offsetValue) {
      query += ` OFFSET ${this.offsetValue}`;
    }
    
    return query;
  }

  private buildInsertQuery(values: Partial<T>): string {
    const columns = Object.keys(values).join(', ');
    const placeholders = Object.values(values).map(v => `'${v}'`).join(', ');
    
    return `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
  }

  private buildUpdateQuery(values: Partial<T>): string {
    const setClause = Object.entries(values)
      .map(([key, value]) => `${key} = '${value}'`)
      .join(', ');
    
    let query = `UPDATE ${this.tableName} SET ${setClause}`;
    
    if (Object.keys(this.whereConditions).length > 0) {
      const whereClause = Object.entries(this.whereConditions)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
    }
    
    return query;
  }

  private buildDeleteQuery(): string {
    let query = `DELETE FROM ${this.tableName}`;
    
    if (Object.keys(this.whereConditions).length > 0) {
      const whereClause = Object.entries(this.whereConditions)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
    }
    
    return query;
  }
}

/**
 * クライアントサイド用データベースインスタンスを作成
 */
export function createDatabaseClient(config: DatabaseClientConfig): DatabaseClient {
  return new DatabaseClient(config);
} 