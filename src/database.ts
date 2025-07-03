/**
 * Database Module - ksqlDB ORM機能をラップしたSupabaseライクなAPI
 */

// 既存のksqlDB ORM機能を再エクスポート
export * from './types';
export * from './field-types';
export * from './schema';
export * from './model';
export * from './query-builder';
export * from './policy';
export * from './context';
export * from './ksqldb-client';
export * from './schema-registry';

import { 
  defineSchema as originalDefineSchema,
  defineModel as originalDefineModel,
  definePolicy as originalDefinePolicy,
  init as originalInit,
  OrmConfig
} from './index';

/**
 * Database クラス - Supabaseライクなインターフェース
 */
export class Database {
  private initialized = false;

  constructor(private config: OrmConfig) {}

  /**
   * データベースを初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await originalInit(this.config);
    this.initialized = true;
  }

  /**
   * スキーマを定義
   */
  defineSchema = originalDefineSchema;

  /**
   * モデルを定義
   */
  defineModel = originalDefineModel;

  /**
   * RLSポリシーを定義
   */
  definePolicy = originalDefinePolicy;

  /**
   * テーブルからデータを取得（Supabaseライク）
   */
  from<T = any>(table: string): DatabaseQueryBuilder<T> {
    return new DatabaseQueryBuilder<T>(table);
  }

  /**
   * SQL文を直接実行（自動でエンドポイントを選択）
   */
  async sql(query: string, params?: any[]): Promise<any> {
    const { executeAnyQuery } = await import('./ksqldb-client');
    return executeAnyQuery(query);
  }

  /**
   * ヘルスチェック
   */
  async health(): Promise<{ status: 'ok' | 'error'; details?: any }> {
    try {
      const { healthCheck } = await import('./index');
      const result = await healthCheck();
      
      if (result.ksqldb && result.schemaRegistry) {
        return { status: 'ok', details: result };
      } else {
        return { status: 'error', details: result };
      }
    } catch (error) {
      return { status: 'error', details: error };
    }
  }
}

/**
 * Supabaseライクなクエリビルダー
 */
export class DatabaseQueryBuilder<T = any> {
  protected selectFields: string[] = ['*'];
  protected whereConditions: any = {};
  protected orderByConditions: any = {};
  protected limitValue?: number;
  protected offsetValue?: number;

  constructor(protected tableName: string) {}

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
      const { buildSelectQuery } = await import('./query-builder');
      const { executePullQuery } = await import('./ksqldb-client');

      const query = buildSelectQuery(
        this.tableName,
        this.selectFields,
        this.whereConditions,
        this.orderByConditions,
        this.limitValue,
        this.offsetValue
      );

      const result = await executePullQuery(query);
      
      // ksqlDBの /query-stream レスポンスを解析
      const data = result?.data || [];
      
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
      const { buildInsertQuery } = await import('./query-builder');
      const { executeQuery } = await import('./ksqldb-client');

      const query = buildInsertQuery(this.tableName, values);
      await executeQuery(query);
      
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
      const { buildUpdateQuery } = await import('./query-builder');
      const { executeQuery } = await import('./ksqldb-client');

      const query = buildUpdateQuery(this.tableName, this.whereConditions, values);
      await executeQuery(query);
      
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
      const { buildDeleteQuery } = await import('./query-builder');
      const { executeQuery } = await import('./ksqldb-client');

      const query = buildDeleteQuery(this.tableName, this.whereConditions);
      await executeQuery(query);
      
      return { data: { deleted: true } };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * リアルタイムデータをストリーミング（ksqlDB固有機能）
   */
  async stream(
    onData: (data: T) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<{ terminate: () => void }> {
    try {
      const { buildSelectQuery } = await import('./query-builder');
      const { executePushQuery } = await import('./ksqldb-client');

             // EMIT CHANGES を追加してプッシュクエリにする
       let baseQuery = buildSelectQuery(
         this.tableName,
         this.selectFields,
         this.whereConditions,
         this.orderByConditions,
         this.limitValue,
         this.offsetValue
       );
       
       // セミコロンを削除してEMIT CHANGESを追加してからセミコロンを付ける
       if (baseQuery.endsWith(';')) {
         baseQuery = baseQuery.slice(0, -1);
       }
       const query = baseQuery + ' EMIT CHANGES;';
       
       console.log('🔍 Generated push query SQL:', query);

      return executePushQuery(
        query,
        (streamData) => {
          onData(streamData.row);
        },
        onError,
        onComplete
      );
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      return { terminate: () => {} };
    }
  }
}

/**
 * デフォルトデータベースインスタンスを作成
 */
export function createDatabase(config: OrmConfig): Database {
  return new Database(config);
} 