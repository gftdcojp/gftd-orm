import { KsqlDBClient } from './client';
import { QueryBuilder } from '../query/builder';
import { 
  KsqlConnectionConfig, 
  KsqlStreamDefinition, 
  KsqlTableDefinition,
  KsqlResponse,
  InferSchemaType,
  KsqlColumnDefinition
} from '../types';

export class KsqlDB {
  private client: KsqlDBClient;
  private streams = new Map<string, KsqlStreamDefinition>();
  private tables = new Map<string, KsqlTableDefinition>();

  constructor(config: KsqlConnectionConfig) {
    this.client = new KsqlDBClient(config);
  }

  registerStream<T extends readonly KsqlColumnDefinition[]>(
    definition: KsqlStreamDefinition & { columns: T }
  ): Stream<InferSchemaType<T>> {
    this.streams.set(definition.name, definition);
    return new Stream<InferSchemaType<T>>(this.client, definition);
  }

  registerTable<T extends readonly KsqlColumnDefinition[]>(
    definition: KsqlTableDefinition & { columns: T }
  ): Table<InferSchemaType<T>> {
    this.tables.set(definition.name, definition);
    return new Table<InferSchemaType<T>>(this.client, definition);
  }

  async createStream(definition: KsqlStreamDefinition): Promise<KsqlResponse> {
    const columns = definition.columns
      .map(col => {
        let colDef = `${col.name} ${col.type}`;
        if (col.key) colDef += ' KEY';
        if (col.headers) colDef += ' HEADERS';
        return colDef;
      })
      .join(', ');

    let query = `CREATE STREAM ${definition.name} (${columns})`;

    const props: string[] = [];
    if (definition.keyColumn) props.push(`KEY = '${definition.keyColumn}'`);
    if (definition.valueFormat) props.push(`VALUE_FORMAT = '${definition.valueFormat}'`);
    if (definition.topic) props.push(`KAFKA_TOPIC = '${definition.topic}'`);
    if (definition.partitions) props.push(`PARTITIONS = ${definition.partitions}`);
    if (definition.replicas) props.push(`REPLICAS = ${definition.replicas}`);
    if (definition.timestamp) props.push(`TIMESTAMP = '${definition.timestamp}'`);
    if (definition.timestampFormat) props.push(`TIMESTAMP_FORMAT = '${definition.timestampFormat}'`);

    if (props.length > 0) {
      query += ` WITH (${props.join(', ')})`;
    }

    query += ';';

    return this.client.execute(query);
  }

  async createTable(definition: KsqlTableDefinition): Promise<KsqlResponse> {
    const columns = definition.columns
      .map(col => {
        let colDef = `${col.name} ${col.type}`;
        if (col.key) colDef += ' KEY';
        if (col.headers) colDef += ' HEADERS';
        return colDef;
      })
      .join(', ');

    let query = `CREATE TABLE ${definition.name} (${columns})`;

    const props: string[] = [];
    props.push(`KEY = '${definition.keyColumn}'`);
    if (definition.valueFormat) props.push(`VALUE_FORMAT = '${definition.valueFormat}'`);
    if (definition.topic) props.push(`KAFKA_TOPIC = '${definition.topic}'`);
    if (definition.partitions) props.push(`PARTITIONS = ${definition.partitions}`);
    if (definition.replicas) props.push(`REPLICAS = ${definition.replicas}`);

    query += ` WITH (${props.join(', ')})`;
    query += ';';

    return this.client.execute(query);
  }

  async dropStream(name: string, deleteTopicFlag = false): Promise<KsqlResponse> {
    const deleteTopic = deleteTopicFlag ? ' DELETE TOPIC' : '';
    return this.client.execute(`DROP STREAM ${name}${deleteTopic};`);
  }

  async dropTable(name: string, deleteTopicFlag = false): Promise<KsqlResponse> {
    const deleteTopic = deleteTopicFlag ? ' DELETE TOPIC' : '';
    return this.client.execute(`DROP TABLE ${name}${deleteTopic};`);
  }

  async execute(ksql: string): Promise<KsqlResponse> {
    return this.client.execute(ksql);
  }

  async query<T = any>(ksql: string): Promise<T[]> {
    return this.client.query<T>(ksql);
  }

  getClient(): KsqlDBClient {
    return this.client;
  }
}

export class Stream<T = any> {
  constructor(
    private client: KsqlDBClient,
    private definition: KsqlStreamDefinition
  ) {}

  select(...fields: (keyof T)[]): QueryBuilder<T> {
    const builder = new QueryBuilder<T>(this.client, this.definition);
    if (fields.length > 0) {
      return builder.select(...(fields as string[]));
    }
    return builder;
  }

  async insert(data: Partial<T>): Promise<KsqlResponse> {
    const columns = Object.keys(data);
    const values = Object.values(data).map(v => this.formatValue(v));
    
    const query = `INSERT INTO ${this.definition.name} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
    return this.client.execute(query);
  }

  async insertMany(data: Partial<T>[]): Promise<KsqlResponse[]> {
    const results: KsqlResponse[] = [];
    
    for (const row of data) {
      const result = await this.insert(row);
      results.push(result);
    }
    
    return results;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString()}'`;
    if (Array.isArray(value)) return `ARRAY[${value.map(v => this.formatValue(v)).join(', ')}]`;
    if (typeof value === 'object') return `'${JSON.stringify(value)}'`;
    return String(value);
  }
}

export class Table<T = any> {
  constructor(
    private client: KsqlDBClient,
    private definition: KsqlTableDefinition
  ) {}

  select(...fields: (keyof T)[]): QueryBuilder<T> {
    const builder = new QueryBuilder<T>(this.client, this.definition);
    if (fields.length > 0) {
      return builder.select(...(fields as string[]));
    }
    return builder;
  }

  async insert(data: Partial<T>): Promise<KsqlResponse> {
    const columns = Object.keys(data);
    const values = Object.values(data).map(v => this.formatValue(v));
    
    const query = `INSERT INTO ${this.definition.name} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
    return this.client.execute(query);
  }

  async insertMany(data: Partial<T>[]): Promise<KsqlResponse[]> {
    const results: KsqlResponse[] = [];
    
    for (const row of data) {
      const result = await this.insert(row);
      results.push(result);
    }
    
    return results;
  }

  async upsert(data: Partial<T>): Promise<KsqlResponse> {
    return this.insert(data);
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString()}'`;
    if (Array.isArray(value)) return `ARRAY[${value.map(v => this.formatValue(v)).join(', ')}]`;
    if (typeof value === 'object') return `'${JSON.stringify(value)}'`;
    return String(value);
  }
}