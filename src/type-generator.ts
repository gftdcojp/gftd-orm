/**
 * TypeScript型生成機能 - ksqlDBスキーマから自動型定義生成
 * 
 * @todo TypeScript型定義の自動生成
 * @todo マッパー関数の自動生成
 * @todo カラムメタデータの生成
 */

import { executeQuery, describeTable } from './ksqldb-client';
import { log } from './utils/logger';

/**
 * ksqlDB データ型のマッピング
 */
const KSQL_TYPE_TO_TYPESCRIPT: Record<string, string> = {
  'STRING': 'string',
  'VARCHAR': 'string',
  'INTEGER': 'number',
  'INT': 'number', 
  'BIGINT': 'number',
  'DOUBLE': 'number',
  'BOOLEAN': 'boolean',
  'TIMESTAMP': 'string', // ISO 8601 文字列として扱う
  'DATE': 'string',
  'TIME': 'string',
  'DECIMAL': 'number',
  'BYTES': 'Uint8Array',
};

/**
 * テーブル/ストリーム情報を取得する型
 */
export interface TableInfo {
  name: string;
  type: 'TABLE' | 'STREAM';
  topic: string;
  keyFormat: string;
  valueFormat: string;
  isWindowed: boolean;
}

/**
 * カラム情報を表す型
 */
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: boolean;
}

/**
 * スキーマ情報を表す型
 */
export interface SchemaInfo {
  tableName: string;
  columns: ColumnInfo[];
  tableInfo: TableInfo;
}

/**
 * 生成されるTypeScript型の情報
 */
export interface GeneratedTypeInfo {
  interfaceName: string;
  interfaceCode: string;
  mapperFunctionName: string;
  mapperCode: string;
  columnMetadata: string;
  fullCode: string;
}

/**
 * 全テーブル/ストリーム一覧を取得
 * @returns テーブル・ストリーム情報の配列
 */
export async function listAllTables(): Promise<TableInfo[]> {
  try {
    // テーブル一覧を取得
    const tablesResult = await executeQuery('LIST TABLES EXTENDED;');
    const streamsResult = await executeQuery('LIST STREAMS EXTENDED;');
    
    const tables: TableInfo[] = [];
    
    // テーブル情報を処理
    if (tablesResult && Array.isArray(tablesResult)) {
      for (const result of tablesResult) {
        if (result.tables && Array.isArray(result.tables)) {
          for (const table of result.tables) {
            tables.push({
              name: table.name,
              type: 'TABLE',
              topic: table.topic || '',
              keyFormat: table.keyFormat || 'KAFKA',
              valueFormat: table.valueFormat || 'JSON',
              isWindowed: table.isWindowed || false,
            });
          }
        }
      }
    }
    
    // ストリーム情報を処理  
    if (streamsResult && Array.isArray(streamsResult)) {
      for (const result of streamsResult) {
        if (result.streams && Array.isArray(result.streams)) {
          for (const stream of result.streams) {
            tables.push({
              name: stream.name,
              type: 'STREAM',
              topic: stream.topic || '',
              keyFormat: stream.keyFormat || 'KAFKA',
              valueFormat: stream.valueFormat || 'JSON',
              isWindowed: false, // ストリームはwindowedではない
            });
          }
        }
      }
    }
    
    return tables;
  } catch (error) {
    log.error('Failed to list tables and streams:', error);
    throw new Error(`Failed to list tables and streams: ${error}`);
  }
}

/**
 * テーブル/ストリームのスキーマ情報を取得
 * @param tableName - テーブル/ストリーム名
 * @returns スキーマ情報
 */
export async function getTableSchema(tableName: string): Promise<SchemaInfo> {
  try {
    log.debug(`Getting schema for table: ${tableName}`);
    
    // テーブル詳細情報を取得
    const describeResult = await describeTable(tableName);
    log.debug(`Describe result for ${tableName}:`, describeResult);
    
    if (!describeResult || !Array.isArray(describeResult) || describeResult.length === 0) {
      throw new Error(`No schema information found for table: ${tableName}`);
    }
    
    const sourceDescription = describeResult[0]?.sourceDescription;
    if (!sourceDescription) {
      throw new Error(`Invalid schema information for table: ${tableName}`);
    }
    
    // カラム情報を解析
    const columns: ColumnInfo[] = [];
    if (sourceDescription.fields && Array.isArray(sourceDescription.fields)) {
      for (const field of sourceDescription.fields) {
        columns.push({
          name: field.name,
          type: field.schema?.type || 'STRING',
          nullable: field.schema?.isOptional !== false,
          key: field.schema?.isKey === true,
        });
      }
    }
    
    // テーブル情報を構築
    const tableInfo: TableInfo = {
      name: sourceDescription.name || tableName,
      type: sourceDescription.type === 'STREAM' ? 'STREAM' : 'TABLE',
      topic: sourceDescription.topic || '',
      keyFormat: sourceDescription.keyFormat || 'KAFKA',
      valueFormat: sourceDescription.valueFormat || 'JSON',
      isWindowed: sourceDescription.windowType !== undefined,
    };
    
    return {
      tableName,
      columns,
      tableInfo,
    };
  } catch (error) {
    log.error(`Failed to get schema for table ${tableName}:`, error);
    throw new Error(`Failed to get schema for table ${tableName}: ${error}`);
  }
}

/**
 * ksqlDB型をTypeScript型に変換
 * @param ksqlType - ksqlDBのデータ型
 * @param nullable - null許可フラグ
 * @returns TypeScript型文字列
 */
export function convertKsqlTypeToTypeScript(ksqlType: string, nullable: boolean = true): string {
  // 配列型の処理 (ARRAY<TYPE>)
  const arrayMatch = ksqlType.match(/^ARRAY<(.+)>$/i);
  if (arrayMatch) {
    const innerType = convertKsqlTypeToTypeScript(arrayMatch[1], false);
    const baseType = `${innerType}[]`;
    return nullable ? `${baseType} | null` : baseType;
  }
  
  // マップ型の処理 (MAP<STRING, TYPE>)
  const mapMatch = ksqlType.match(/^MAP<\s*STRING\s*,\s*(.+)\s*>$/i);
  if (mapMatch) {
    const valueType = convertKsqlTypeToTypeScript(mapMatch[1], false);
    const baseType = `Record<string, ${valueType}>`;
    return nullable ? `${baseType} | null` : baseType;
  }
  
  // 基本型の変換
  const upperType = ksqlType.toUpperCase();
  const tsType = KSQL_TYPE_TO_TYPESCRIPT[upperType] || 'any';
  
  return nullable ? `${tsType} | null` : tsType;
}

/**
 * TypeScript インターフェースを生成
 * @param schema - スキーマ情報
 * @returns 生成されたインターフェースコード
 */
export function generateTypeScriptInterface(schema: SchemaInfo): string {
  const interfaceName = generateInterfaceName(schema.tableName);
  
  const properties = schema.columns
    .map(column => {
      const tsType = convertKsqlTypeToTypeScript(column.type, column.nullable);
      const propertyName = column.name.toLowerCase();
      return `  /** ${column.type}${column.nullable ? ' (nullable)' : ''} */\n  ${propertyName}: ${tsType};`;
    })
    .join('\n');
  
  return `/**
 * Generated TypeScript interface for ksqlDB table: ${schema.tableName}
 * Generated on: ${new Date().toISOString()}
 */
export interface ${interfaceName} {
${properties}
}`;
}

/**
 * マッパー関数を生成
 * @param schema - スキーマ情報  
 * @returns 生成されたマッパー関数コード
 */
export function generateMapperFunction(schema: SchemaInfo): string {
  const interfaceName = generateInterfaceName(schema.tableName);
  const functionName = generateMapperFunctionName(schema.tableName);
  
  const mappings = schema.columns
    .map((column, index) => {
      const propertyName = column.name.toLowerCase();
      return `    ${propertyName}: row[${index}]`;
    })
    .join(',\n');
  
  return `/**
 * Generated mapper function for converting ksqlDB array response to ${interfaceName} object
 * @param row - Array response from ksqlDB pull query
 * @returns ${interfaceName} object
 */
export function ${functionName}(row: any[]): ${interfaceName} {
  return {
${mappings}
  };
}`;
}

/**
 * カラムメタデータを生成
 * @param schema - スキーマ情報
 * @returns 生成されたメタデータコード
 */
export function generateColumnMetadata(schema: SchemaInfo): string {
  const constantName = generateColumnConstantName(schema.tableName);
  
  const columnNames = schema.columns.map(col => `'${col.name}'`).join(', ');
  const columnTypes = schema.columns.map(col => `'${col.type}'`).join(', ');
  
  return `/**
 * Generated column metadata for ksqlDB table: ${schema.tableName}
 */
export const ${constantName} = {
  names: [${columnNames}],
  types: [${columnTypes}],
  nullable: [${schema.columns.map(col => col.nullable).join(', ')}],
  keyColumns: [${schema.columns.map(col => col.key).join(', ')}]
} as const;`;
}

/**
 * 完全なTypeScript型定義ファイルを生成
 * @param schema - スキーマ情報
 * @returns 生成された完全な型定義情報
 */
export function generateCompleteTypeDefinition(schema: SchemaInfo): GeneratedTypeInfo {
  const interfaceName = generateInterfaceName(schema.tableName);
  const interfaceCode = generateTypeScriptInterface(schema);
  const mapperFunctionName = generateMapperFunctionName(schema.tableName);
  const mapperCode = generateMapperFunction(schema);
  const columnMetadata = generateColumnMetadata(schema);
  
  const fullCode = `// Generated TypeScript definitions for ksqlDB table: ${schema.tableName}
// Generated on: ${new Date().toISOString()}
// DO NOT EDIT - This file is auto-generated

${interfaceCode}

${mapperCode}

${columnMetadata}

// Re-export for convenience
export type ${schema.tableName.toUpperCase()}_TYPE = ${interfaceName};
`;

  return {
    interfaceName,
    interfaceCode,
    mapperFunctionName,
    mapperCode,
    columnMetadata,
    fullCode,
  };
}

/**
 * テーブル名からインターフェース名を生成
 * @param tableName - テーブル名
 * @returns インターフェース名
 */
export function generateInterfaceName(tableName: string): string {
  // TABLE_table のような重複を修正
  const cleanName = tableName.replace(/_table$/i, '').replace(/_stream$/i, '');
  
  // 特殊文字をアンダースコアに変換
  const normalizedName = cleanName.replace(/[^a-zA-Z0-9_]/g, '_');
  
  return normalizedName
    .split('_')
    .filter(word => word.length > 0) // 空の文字列を除外
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('') + 'Table';
}

/**
 * テーブル名からマッパー関数名を生成
 * @param tableName - テーブル名  
 * @returns マッパー関数名
 */
export function generateMapperFunctionName(tableName: string): string {
  const interfaceName = generateInterfaceName(tableName);
  return `map${interfaceName}Row`;
}

/**
 * テーブル名からカラム定数名を生成
 * @param tableName - テーブル名
 * @returns カラム定数名
 */
export function generateColumnConstantName(tableName: string): string {
  // TABLE_table のような重複を修正
  const cleanName = tableName.replace(/_table$/i, '').replace(/_stream$/i, '');
  
  // 特殊文字をアンダースコアに変換
  const normalizedName = cleanName.replace(/[^a-zA-Z0-9_]/g, '_');
  
  return `${normalizedName.toUpperCase()}_COLUMNS`;
}

/**
 * 複数テーブルの型定義を一括生成
 * @param tableNames - テーブル名の配列（省略時は全テーブル）
 * @returns 生成された型定義情報の配列
 */
export async function generateTypesForTables(tableNames?: string[]): Promise<GeneratedTypeInfo[]> {
  try {
    let tables: string[];
    
    if (tableNames && tableNames.length > 0) {
      tables = tableNames;
    } else {
      // 全テーブルを取得
      const allTables = await listAllTables();
      tables = allTables.map(t => t.name);
    }
    
    const results: GeneratedTypeInfo[] = [];
    
    for (const tableName of tables) {
      try {
        log.info(`Generating types for table: ${tableName}`);
        const schema = await getTableSchema(tableName);
        const typeInfo = generateCompleteTypeDefinition(schema);
        results.push(typeInfo);
        log.info(`Successfully generated types for table: ${tableName}`);
      } catch (error) {
        log.error(`Failed to generate types for table ${tableName}:`, error);
        // 個別テーブルの失敗は全体を止めない
        continue;
      }
    }
    
    return results;
  } catch (error) {
    log.error('Failed to generate types for tables:', error);
    throw new Error(`Failed to generate types for tables: ${error}`);
  }
} 