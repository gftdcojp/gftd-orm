/**
 * 基本型定義
 */

export interface ExecutionContext {
  userId: string;
  tenantId: string;
  roles: string[];
  [key: string]: any;
}

export interface KsqlDbConfig {
  url: string;
  apiKey?: string;
  apiSecret?: string;
  headers?: Record<string, string>;
}

export interface SchemaRegistryConfig {
  url: string;
  auth?: {
    user: string;
    pass: string;
  };
  apiKey?: string;
}

export interface OrmConfig {
  ksql: KsqlDbConfig;
  schemaRegistry: SchemaRegistryConfig;
}

/**
 * ksqlDB のストリーム/テーブルの種類
 */
export enum StreamType {
  STREAM = 'STREAM',
  TABLE = 'TABLE',
  MATERIALIZED_VIEW = 'MATERIALIZED_VIEW'
}

export interface AvroSchema {
  type: 'record';
  name: string;
  fields: AvroField[];
}

export interface AvroField {
  name: string;
  type: string | string[] | AvroComplexType;
  default?: any;
}

export interface AvroComplexType {
  type: string;
  logicalType?: string;
  [key: string]: any;
}

/**
 * Materialized View 設定
 */
export interface MaterializedViewConfig {
  sourceTable?: string;
  sourceStream?: string;
  query?: string;
  groupBy?: string[];
  aggregations?: Record<string, string>;
  windowConfig?: {
    type: 'TUMBLING' | 'HOPPING' | 'SESSION';
    size: string;
    advanceBy?: string;
  };
  refreshInterval?: number;
}

/**
 * SQL オプション（拡張）
 */
export interface SqlOptions {
  as?: string;
  with?: Record<string, any>;
  materializedView?: MaterializedViewConfig;
  partitions?: number;
  replicas?: number;
  [key: string]: any;
}

export interface WhereCondition {
  [field: string]: any | {
    like?: string;
    in?: any[];
    gt?: any;
    gte?: any;
    lt?: any;
    lte?: any;
    eq?: any;
    ne?: any;
  };
}

export interface OrderByCondition {
  [field: string]: 'asc' | 'desc';
}

export interface FindManyOptions {
  where?: WhereCondition;
  orderBy?: OrderByCondition;
  limit?: number;
  offset?: number;
}

export type PolicyFunction = (ctx: ExecutionContext) => string; 