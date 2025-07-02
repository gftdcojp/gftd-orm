import { KsqlColumnDefinition, KsqlDataType, KsqlStreamDefinition, KsqlTableDefinition } from '../types';

export class KsqlColumn<T extends KsqlDataType = KsqlDataType, N extends boolean = false> {
  constructor(
    public name: string,
    public type: T,
    public config: {
      nullable?: N;
      key?: boolean;
      headers?: boolean;
      partitionKey?: boolean;
    } = {}
  ) {}

  notNull(): KsqlColumn<T, false> {
    return new KsqlColumn(this.name, this.type, { ...this.config, nullable: false });
  }

  nullable(): KsqlColumn<T, true> {
    return new KsqlColumn(this.name, this.type, { ...this.config, nullable: true });
  }

  key(): KsqlColumn<T, N> {
    return new KsqlColumn(this.name, this.type, { ...this.config, key: true });
  }

  partitionKey(): KsqlColumn<T, N> {
    return new KsqlColumn(this.name, this.type, { ...this.config, partitionKey: true });
  }

  headers(): KsqlColumn<T, N> {
    return new KsqlColumn(this.name, this.type, { ...this.config, headers: true });
  }

  toDefinition(): KsqlColumnDefinition {
    return {
      name: this.name,
      type: this.type,
      nullable: this.config.nullable,
      key: this.config.key,
      headers: this.config.headers,
      partitionKey: this.config.partitionKey,
    };
  }
}

export class KsqlSchema {
  static varchar(name: string): KsqlColumn<'VARCHAR', false> {
    return new KsqlColumn(name, 'VARCHAR');
  }

  static string(name: string): KsqlColumn<'STRING', false> {
    return new KsqlColumn(name, 'STRING');
  }

  static int(name: string): KsqlColumn<'INT', false> {
    return new KsqlColumn(name, 'INT');
  }

  static integer(name: string): KsqlColumn<'INTEGER', false> {
    return new KsqlColumn(name, 'INTEGER');
  }

  static bigint(name: string): KsqlColumn<'BIGINT', false> {
    return new KsqlColumn(name, 'BIGINT');
  }

  static double(name: string): KsqlColumn<'DOUBLE', false> {
    return new KsqlColumn(name, 'DOUBLE');
  }

  static boolean(name: string): KsqlColumn<'BOOLEAN', false> {
    return new KsqlColumn(name, 'BOOLEAN');
  }

  static decimal(name: string): KsqlColumn<'DECIMAL', false> {
    return new KsqlColumn(name, 'DECIMAL');
  }

  static bytes(name: string): KsqlColumn<'BYTES', false> {
    return new KsqlColumn(name, 'BYTES');
  }

  static date(name: string): KsqlColumn<'DATE', false> {
    return new KsqlColumn(name, 'DATE');
  }

  static time(name: string): KsqlColumn<'TIME', false> {
    return new KsqlColumn(name, 'TIME');
  }

  static timestamp(name: string): KsqlColumn<'TIMESTAMP', false> {
    return new KsqlColumn(name, 'TIMESTAMP');
  }

  static array(name: string): KsqlColumn<'ARRAY', false> {
    return new KsqlColumn(name, 'ARRAY');
  }

  static map(name: string): KsqlColumn<'MAP', false> {
    return new KsqlColumn(name, 'MAP');
  }

  static struct(name: string): KsqlColumn<'STRUCT', false> {
    return new KsqlColumn(name, 'STRUCT');
  }
}

export interface StreamConfig {
  keyColumn?: string;
  valueFormat?: 'JSON' | 'AVRO' | 'PROTOBUF' | 'DELIMITED';
  topic?: string;
  partitions?: number;
  replicas?: number;
  timestamp?: string;
  timestampFormat?: string;
}

export interface TableConfig {
  keyColumn: string;
  valueFormat?: 'JSON' | 'AVRO' | 'PROTOBUF' | 'DELIMITED';
  topic?: string;
  partitions?: number;
  replicas?: number;
}

export function defineStream<T extends Record<string, KsqlColumn>>(
  name: string,
  columns: T,
  config?: StreamConfig
): KsqlStreamDefinition {
  const columnDefinitions = Object.values(columns).map(col => col.toDefinition());
  
  return {
    name,
    columns: columnDefinitions,
    ...config
  };
}

export function defineTable<T extends Record<string, KsqlColumn>>(
  name: string,
  columns: T,
  config: TableConfig
): KsqlTableDefinition {
  const columnDefinitions = Object.values(columns).map(col => col.toDefinition());
  
  return {
    name,
    columns: columnDefinitions,
    ...config
  };
}