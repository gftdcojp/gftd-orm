export type KsqlDataType = 
  | 'VARCHAR' | 'STRING'
  | 'INT' | 'INTEGER' 
  | 'BIGINT'
  | 'DOUBLE'
  | 'BOOLEAN'
  | 'DECIMAL'
  | 'BYTES'
  | 'DATE'
  | 'TIME'
  | 'TIMESTAMP'
  | 'ARRAY'
  | 'MAP'
  | 'STRUCT';

export type KsqlValue = string | number | boolean | null | Array<string | number | boolean | null> | Record<string, string | number | boolean | null>;

export interface KsqlColumnDefinition {
  name: string;
  type: KsqlDataType;
  nullable?: boolean;
  key?: boolean;
  headers?: boolean;
  partitionKey?: boolean;
}

export interface KsqlStreamDefinition {
  name: string;
  columns: KsqlColumnDefinition[];
  keyColumn?: string;
  valueFormat?: 'JSON' | 'AVRO' | 'PROTOBUF' | 'DELIMITED';
  topic?: string;
  partitions?: number;
  replicas?: number;
  timestamp?: string;
  timestampFormat?: string;
}

export interface KsqlTableDefinition {
  name: string;
  columns: KsqlColumnDefinition[];
  keyColumn: string;
  valueFormat?: 'JSON' | 'AVRO' | 'PROTOBUF' | 'DELIMITED';
  topic?: string;
  partitions?: number;
  replicas?: number;
}

export interface KsqlQueryOptions {
  emitChanges?: boolean;
  limit?: number;
  offset?: number;
  where?: string | WhereCondition;
  orderBy?: OrderByClause[];
  groupBy?: string[];
  having?: string | WhereCondition;
  windowType?: 'TUMBLING' | 'HOPPING' | 'SESSION';
  windowSize?: string;
}

export interface WhereCondition {
  column: string;
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL';
  value?: KsqlValue;
  values?: KsqlValue[];
}

export interface OrderByClause {
  column: string;
  direction?: 'ASC' | 'DESC';
}

export interface KsqlConnectionConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  ssl?: boolean;
  timeout?: number;
}

export interface KsqlResponse<T = any> {
  '@type': string;
  statementText?: string;
  commandId?: string;
  commandStatus?: {
    status: string;
    message: string;
  };
  data?: T[];
  error?: {
    message: string;
    stackTrace?: string[];
  };
}

export type InferColumnType<T extends KsqlDataType> = 
  T extends 'VARCHAR' | 'STRING' ? string :
  T extends 'INT' | 'INTEGER' ? number :
  T extends 'BIGINT' ? number :
  T extends 'DOUBLE' | 'DECIMAL' ? number :
  T extends 'BOOLEAN' ? boolean :
  T extends 'DATE' | 'TIME' | 'TIMESTAMP' ? Date :
  T extends 'BYTES' ? Buffer :
  T extends 'ARRAY' ? any[] :
  T extends 'MAP' ? Record<string, any> :
  T extends 'STRUCT' ? Record<string, any> :
  any;

export type InferSchemaType<T extends readonly KsqlColumnDefinition[]> = {
  [K in T[number] as K['name']]: K['nullable'] extends true 
    ? InferColumnType<K['type']> | null
    : InferColumnType<K['type']>;
};