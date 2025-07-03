/**
 * ベンチマークテスト
 */

import { bench, describe } from 'vitest';
import { defineSchema, clearSchemaRegistry } from '../schema';
import { defineModel } from '../model';
import { StreamType } from '../types';
import { FieldType } from '../field-types';
import { buildSelectQuery, buildInsertQuery } from '../query-builder';

describe('Benchmark Tests', () => {
  bench('schema creation', () => {
    clearSchemaRegistry();
    
    defineSchema('BenchTest', {
      id: FieldType.UUID.primaryKey(),
      tenantId: FieldType.UUID.notNull(),
      name: FieldType.STRING.notNull(),
      email: FieldType.STRING.notNull(),
      created: FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
    });
  });

  bench('model creation', () => {
    const schema = defineSchema('BenchModelTest', {
      id: FieldType.UUID.primaryKey(),
      name: FieldType.STRING.notNull(),
    });

    defineModel({
      schema,
      type: StreamType.TABLE,
      topic: 'bench_test',
      key: 'id',
    });
  });

  bench('select query building', () => {
    buildSelectQuery(
      'users',
      ['id', 'name', 'email'],
      { status: 'active', tenantId: 'tenant-123' },
      { created: 'desc' },
      100,
      10
    );
  });

  bench('insert query building', () => {
    buildInsertQuery('users', {
      id: 'user-123',
      tenantId: 'tenant-456',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'active',
      created: new Date(),
    });
  });

  bench('complex field type creation', () => {
    defineSchema('ComplexBenchTest', {
      id: FieldType.UUID.primaryKey(),
      name: FieldType.STRING.notNull(),
      age: FieldType.INT,
      salary: FieldType.DECIMAL(10, 2),
      isActive: FieldType.BOOLEAN.withDefault(true),
      tags: FieldType.ARRAY(FieldType.STRING),
      metadata: FieldType.MAP(FieldType.STRING),
      created: FieldType.TIMESTAMP.withDefault('CURRENT_TIMESTAMP'),
      updated: FieldType.TIMESTAMP,
    });
  });

  bench('multiple schema operations', () => {
    for (let i = 0; i < 10; i++) {
      const schema = defineSchema(`BenchMultiple${i}`, {
        id: FieldType.UUID.primaryKey(),
        name: FieldType.STRING.notNull(),
        index: FieldType.INT.withDefault(i),
      });

      defineModel({
        schema,
        type: StreamType.STREAM,
        topic: `bench_topic_${i}`,
        key: 'id',
      });
    }
  });
}); 