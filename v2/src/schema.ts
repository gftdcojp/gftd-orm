/**
 * Schema 定義層 - defineSchema() で TypeScript 型→Avro Schema 生成＆登録
 */

import { BaseFieldType } from './field-types';
import { AvroSchema, AvroField } from './types';

export interface SchemaDefinition {
  name: string;
  fields: Record<string, BaseFieldType>;
  avroSchema: AvroSchema;
}

/**
 * スキーマ定義のレジストリ
 */
const schemaRegistry = new Map<string, SchemaDefinition>();

/**
 * TypeScript スキーマからインデックス型を生成
 */
export type InferSchemaType<T extends Record<string, BaseFieldType>> = {
  [K in keyof T]: InferFieldType<T[K]>;
};

/**
 * フィールド型からTypeScript型を推論
 */
export type InferFieldType<T extends BaseFieldType> = 
  T extends { definition: { type: 'string' } } ? string :
  T extends { definition: { type: 'int' } } ? number :
  T extends { definition: { type: 'long' } } ? number :
  T extends { definition: { type: 'double' } } ? number :
  T extends { definition: { type: 'boolean' } } ? boolean :
  T extends { definition: { logicalType: 'uuid' } } ? string :
  T extends { definition: { logicalType: 'timestamp-millis' } } ? Date :
  T extends { definition: { logicalType: 'date' } } ? Date :
  T extends { definition: { logicalType: 'time-millis' } } ? Date :
  T extends { definition: { logicalType: 'decimal' } } ? number :
  any;

/**
 * スキーマ定義関数 - 設計案の通り
 */
export function defineSchema<T extends Record<string, BaseFieldType>>(
  name: string,
  fields: T
): SchemaDefinition & { type: InferSchemaType<T> } {
  // Avro Schema を生成
  const avroFields: AvroField[] = Object.entries(fields).map(([fieldName, fieldType]) => {
    const definition = fieldType.getDefinition();
    const avroField: AvroField = {
      name: fieldName,
      type: fieldType.toAvroType(),
    };

    // デフォルト値があれば追加
    if (definition.default !== undefined) {
      avroField.default = definition.default;
    }

    return avroField;
  });

  const avroSchema: AvroSchema = {
    type: 'record',
    name,
    fields: avroFields,
  };

  const schemaDefinition: SchemaDefinition = {
    name,
    fields,
    avroSchema,
  };

  // レジストリに登録
  schemaRegistry.set(name, schemaDefinition);

  return schemaDefinition as SchemaDefinition & { type: InferSchemaType<T> };
}

/**
 * 登録済みスキーマを取得
 */
export function getSchema(name: string): SchemaDefinition | undefined {
  return schemaRegistry.get(name);
}

/**
 * 全スキーマを取得
 */
export function getAllSchemas(): SchemaDefinition[] {
  return Array.from(schemaRegistry.values());
}

/**
 * スキーマレジストリをクリア（テスト用）
 */
export function clearSchemaRegistry(): void {
  schemaRegistry.clear();
} 