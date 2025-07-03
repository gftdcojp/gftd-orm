/**
 * ksqlDB ORM - メインエントリーポイント
 * 
 * Confluent Schema Registry + ksqlDB を土台に、
 * Drizzle ORM ライクな DSL で型安全なスキーマ＆クエリ定義、
 * RLS はポリシー登録→自動注入で実現。
 */

// 型定義
export * from './types';

// フィールド型定義
export * from './field-types';

// スキーマ定義
export * from './schema';

// モデル定義
export * from './model';

// クエリビルダー
export * from './query-builder';

// RLS ポリシー
export * from './policy';

// 実行コンテキスト
export * from './context';

// クライアント
export * from './ksqldb-client';
export * from './schema-registry';

// メイン初期化
import { OrmConfig } from './types';
import { initializeKsqlDbClient } from './ksqldb-client';
import { initializeSchemaRegistryClient, registerSchema } from './schema-registry';
import { getAllSchemas } from './schema';
import { getAllModels } from './model';
import { executeDDL } from './ksqldb-client';

/**
 * ksqlDB ORM を初期化 - 設計案の通り
 */
export async function init(config: OrmConfig): Promise<void> {
  try {
    console.log('Initializing ksqlDB ORM...');

    // ksqlDB クライアントを初期化
    initializeKsqlDbClient(config.ksql);
    console.log('✓ ksqlDB client initialized');

    // Schema Registry クライアントを初期化
    initializeSchemaRegistryClient(config.schemaRegistry);
    console.log('✓ Schema Registry client initialized');

    // 定義済みスキーマを Schema Registry に登録
    await registerAllSchemas();
    console.log('✓ Schemas registered to Schema Registry');

    // 定義済みモデルの DDL を実行
    await deployAllModels();
    console.log('✓ ksqlDB DDL executed for all models');

    console.log('🎉 ksqlDB ORM initialization completed!');
  } catch (error) {
    console.error('❌ ksqlDB ORM initialization failed:', error);
    throw error;
  }
}

/**
 * 全スキーマを Schema Registry に登録
 */
async function registerAllSchemas(): Promise<void> {
  const schemas = getAllSchemas();
  
  for (const schema of schemas) {
    try {
      const result = await registerSchema(schema.name, schema.avroSchema);
      console.log(`  - Registered schema "${schema.name}" with ID: ${result.id}`);
    } catch (error: any) {
      // スキーマが既に存在する場合は警告として扱う
      if (error.message.includes('already exists') || error.message.includes('Subject not found')) {
        console.warn(`  - Schema "${schema.name}" already exists or subject not found`);
      } else {
        throw new Error(`Failed to register schema "${schema.name}": ${error.message}`);
      }
    }
  }
}

/**
 * 全モデルの DDL を ksqlDB に実行
 */
async function deployAllModels(): Promise<void> {
  const models = getAllModels();
  
  for (const model of models) {
    try {
      // カスタム DDL が指定されている場合はそれを実行
      if (model.definition.sqlOptions?.as) {
        await executeDDL(model.definition.sqlOptions.as);
        console.log(`  - Executed custom DDL for model "${model.definition.schema.name}"`);
      } else {
        // デフォルトの DDL を生成して実行
        const ddl = generateDefaultDDL(model.definition);
        await executeDDL(ddl);
        console.log(`  - Executed default DDL for model "${model.definition.schema.name}"`);
      }
    } catch (error: any) {
      // STREAM/TABLE が既に存在する場合は警告として扱う
      if (error.message.includes('already exists')) {
        console.warn(`  - Model "${model.definition.schema.name}" already exists`);
      } else {
        throw new Error(`Failed to deploy model "${model.definition.schema.name}": ${error.message}`);
      }
    }
  }
}

/**
 * デフォルトのDDLを生成
 */
function generateDefaultDDL(definition: any): string {
  const { schema, type, topic, key, tableName } = definition;
  
  // フィールド定義を ksqlDB 形式に変換
  const fields = Object.entries(schema.fields).map(([name, fieldType]: [string, any]) => {
    const ksqlType = avroToKsqlType(fieldType.toAvroType());
    return `${name} ${ksqlType}`;
  }).join(', ');

  if (type === 'TABLE') {
    return `CREATE TABLE ${tableName} (${fields}) WITH (KAFKA_TOPIC='${topic}', VALUE_FORMAT='AVRO', KEY='${key}');`;
  } else {
    return `CREATE STREAM ${tableName} (${fields}) WITH (KAFKA_TOPIC='${topic}', VALUE_FORMAT='AVRO');`;
  }
}

/**
 * Avro型をksqlDB型に変換
 */
function avroToKsqlType(avroType: any): string {
  if (typeof avroType === 'string') {
    switch (avroType) {
      case 'string': return 'VARCHAR';
      case 'int': return 'INTEGER';
      case 'long': return 'BIGINT';
      case 'double': return 'DOUBLE';
      case 'boolean': return 'BOOLEAN';
      default: return 'VARCHAR';
    }
  }
  
  if (Array.isArray(avroType)) {
    // Nullable 型の場合
    const nonNullType = avroType.find(t => t !== 'null');
    return avroToKsqlType(nonNullType);
  }
  
  if (typeof avroType === 'object' && avroType.type) {
    if (avroType.logicalType) {
      switch (avroType.logicalType) {
        case 'uuid': return 'VARCHAR';
        case 'timestamp-millis': return 'TIMESTAMP';
        case 'date': return 'DATE';
        case 'time-millis': return 'TIME';
        case 'decimal': return 'DECIMAL';
        default: return avroToKsqlType(avroType.type);
      }
    }
    return avroToKsqlType(avroType.type);
  }
  
  return 'VARCHAR';
}

/**
 * ヘルスチェック
 */
export async function healthCheck(): Promise<{ ksqldb: boolean; schemaRegistry: boolean }> {
  try {
    const ksqldbHealth = await checkKsqlDbHealth();
    const schemaRegistryHealth = await checkSchemaRegistryHealth();
    
    return {
      ksqldb: ksqldbHealth,
      schemaRegistry: schemaRegistryHealth,
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      ksqldb: false,
      schemaRegistry: false,
    };
  }
}

/**
 * ksqlDB ヘルスチェック
 */
async function checkKsqlDbHealth(): Promise<boolean> {
  try {
    const { executeQuery } = await import('./ksqldb-client');
    await executeQuery('SHOW STREAMS;');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Schema Registry ヘルスチェック
 */
async function checkSchemaRegistryHealth(): Promise<boolean> {
  try {
    const { listSubjects } = await import('./schema-registry');
    await listSubjects();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 設定情報を取得
 */
export function getConfiguration(): {
  ksqldb: any;
  schemaRegistry: any;
} {
  const { getClientConfig } = require('./ksqldb-client');
  const { getSchemaRegistryConfig } = require('./schema-registry');
  
  return {
    ksqldb: getClientConfig(),
    schemaRegistry: getSchemaRegistryConfig(),
  };
}

/**
 * バージョン情報
 */
export const VERSION = '0.1.0';

/**
 * デバッグ情報
 */
export function debug(): void {
  console.log(`
🔧 ksqlDB ORM Debug Information
================================
Version: ${VERSION}
Registered Schemas: ${getAllSchemas().length}
Registered Models: ${getAllModels().length}
Configuration: ${JSON.stringify(getConfiguration(), null, 2)}
  `);
} 