/**
 * ベンチマークテスト
 */

import { bench, describe, test, expect } from 'vitest';
import { defineSchema, clearSchemaRegistry } from '../schema';
import { FieldType } from '../field-types';

describe('Benchmark Tests', () => {
  // ベンチマークテストは通常のテストモードでは実行しない
  if (process.env.NODE_ENV === 'benchmark') {
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
        defineSchema(`BenchMultiple${i}`, {
          id: FieldType.UUID.primaryKey(),
          name: FieldType.STRING.notNull(),
          index: FieldType.INT.withDefault(i),
        });
      }
    });
  } else {
    test('benchmark tests are skipped in normal mode', () => {
      expect(true).toBe(true);
    });
  }
}); 