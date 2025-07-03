/**
 * スキーマ定義のテスト
 */

import { defineSchema, clearSchemaRegistry, getAllSchemas } from '../schema';
import { FieldType } from '../field-types';

describe('Schema Definition', () => {
  beforeEach(() => {
    clearSchemaRegistry();
  });

  test('should define a schema with basic fields', () => {
    const TestSchema = defineSchema('Test', {
      id: FieldType.UUID.primaryKey(),
      name: FieldType.STRING.notNull(),
      count: FieldType.INT,
    });

    expect(TestSchema.name).toBe('Test');
    expect(TestSchema.avroSchema.type).toBe('record');
    expect(TestSchema.avroSchema.name).toBe('Test');
    expect(TestSchema.avroSchema.fields).toHaveLength(3);
  });

  test('should register schema globally', () => {
    defineSchema('TestGlobal', {
      id: FieldType.STRING.primaryKey(),
    });

    const schemas = getAllSchemas();
    expect(schemas).toHaveLength(1);
    expect(schemas[0].name).toBe('TestGlobal');
  });

  test('should generate correct Avro schema', () => {
    const UserSchema = defineSchema('User', {
      id: FieldType.UUID.primaryKey(),
      tenantId: FieldType.UUID.notNull(),
      name: FieldType.STRING.notNull(),
      email: FieldType.STRING.notNull(),
      created: FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
    });

    const avroSchema = UserSchema.avroSchema;
    
    expect(avroSchema.fields).toHaveLength(5);
    
    const idField = avroSchema.fields.find(f => f.name === 'id');
    expect(idField).toBeDefined();
    expect(idField?.type).toEqual({ type: 'string', logicalType: 'uuid' });
    
    const nameField = avroSchema.fields.find(f => f.name === 'name');
    expect(nameField).toBeDefined();
    expect(nameField?.type).toBe('string');
    
    const createdField = avroSchema.fields.find(f => f.name === 'created');
    expect(createdField).toBeDefined();
    expect(createdField?.default).toBe('CURRENT_TIMESTAMP');
  });

  test('should handle nullable fields correctly', () => {
    const TestSchema = defineSchema('TestNullable', {
      required: FieldType.STRING.notNull(),
      optional: FieldType.STRING,
    });

    const requiredField = TestSchema.avroSchema.fields.find(f => f.name === 'required');
    const optionalField = TestSchema.avroSchema.fields.find(f => f.name === 'optional');
    
    expect(requiredField?.type).toBe('string');
    expect(optionalField?.type).toEqual(['null', 'string']);
  });

  test('should handle different field types', () => {
    const TestSchema = defineSchema('TestTypes', {
      stringField: FieldType.STRING,
      intField: FieldType.INT,
      longField: FieldType.LONG,
      doubleField: FieldType.DOUBLE,
      boolField: FieldType.BOOLEAN,
      uuidField: FieldType.UUID,
      timestampField: FieldType.TIMESTAMP,
      dateField: FieldType.DATE,
      timeField: FieldType.TIME,
      decimalField: FieldType.DECIMAL(10, 2),
    });

    expect(TestSchema.avroSchema.fields).toHaveLength(10);
    
    const fields = TestSchema.avroSchema.fields;
    expect(fields.find(f => f.name === 'stringField')?.type).toEqual(['null', 'string']);
    expect(fields.find(f => f.name === 'intField')?.type).toEqual(['null', 'int']);
    expect(fields.find(f => f.name === 'longField')?.type).toEqual(['null', 'long']);
    expect(fields.find(f => f.name === 'doubleField')?.type).toEqual(['null', 'double']);
    expect(fields.find(f => f.name === 'boolField')?.type).toEqual(['null', 'boolean']);
    
    const uuidField = fields.find(f => f.name === 'uuidField');
    expect(uuidField?.type).toEqual(['null', { type: 'string', logicalType: 'uuid' }]);
    
    const timestampField = fields.find(f => f.name === 'timestampField');
    expect(timestampField?.type).toEqual(['null', { type: 'long', logicalType: 'timestamp-millis' }]);
  });
}); 