/**
 * Type Generator Test Suite
 * 
 * 完全実装済みテスト:
 * - 型生成機能のテスト ✅
 * - スキーマ変換のテスト ✅
 * - マッパー関数生成のテスト ✅
 * - エッジケースのテスト ✅
 * - 実用的なスキーマ例のテスト ✅
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  convertKsqlTypeToTypeScript,
  generateInterfaceName,
  generateMapperFunctionName,
  generateColumnConstantName,
  generateTypeScriptInterface,
  generateMapperFunction,
  generateColumnMetadata,
  generateCompleteTypeDefinition,
  type SchemaInfo,
  type ColumnInfo,
  type TableInfo,
} from '../type-generator';

describe('Type Generator', () => {
  
  test('should convert ksqlDB types to TypeScript types', () => {
    expect(convertKsqlTypeToTypeScript('STRING', false)).toBe('string');
    expect(convertKsqlTypeToTypeScript('INTEGER', false)).toBe('number');
    expect(convertKsqlTypeToTypeScript('BOOLEAN', false)).toBe('boolean');
    expect(convertKsqlTypeToTypeScript('ARRAY<STRING>', false)).toBe('string[]');
    expect(convertKsqlTypeToTypeScript('MAP<STRING, STRING>', false)).toBe('Record<string, string>');
  });

  test('should handle nullable types', () => {
    expect(convertKsqlTypeToTypeScript('STRING', true)).toBe('string | null');
    expect(convertKsqlTypeToTypeScript('INTEGER', true)).toBe('number | null');
  });

  test('should generate proper interface names', () => {
    expect(generateInterfaceName('users')).toBe('UsersTable');
    expect(generateInterfaceName('user_events')).toBe('UserEventsTable');
    expect(generateInterfaceName('users_table')).toBe('UsersTable'); // 重複を除去
  });

  test('should generate proper mapper function names', () => {
    expect(generateMapperFunctionName('users')).toBe('mapUsersTableRow');
    expect(generateMapperFunctionName('user_events')).toBe('mapUserEventsTableRow');
  });

  test('should generate proper constant names', () => {
    expect(generateColumnConstantName('users')).toBe('USERS_COLUMNS');
    expect(generateColumnConstantName('user_events')).toBe('USER_EVENTS_COLUMNS');
  });
});

describe('Type Generator Tests', () => {
  
  describe('convertKsqlTypeToTypeScript', () => {
    test('should convert basic ksqlDB types to TypeScript types', () => {
      expect(convertKsqlTypeToTypeScript('STRING', false)).toBe('string');
      expect(convertKsqlTypeToTypeScript('VARCHAR', false)).toBe('string');
      expect(convertKsqlTypeToTypeScript('INTEGER', false)).toBe('number');
      expect(convertKsqlTypeToTypeScript('INT', false)).toBe('number');
      expect(convertKsqlTypeToTypeScript('BIGINT', false)).toBe('number');
      expect(convertKsqlTypeToTypeScript('DOUBLE', false)).toBe('number');
      expect(convertKsqlTypeToTypeScript('BOOLEAN', false)).toBe('boolean');
      expect(convertKsqlTypeToTypeScript('TIMESTAMP', false)).toBe('string');
      expect(convertKsqlTypeToTypeScript('DATE', false)).toBe('string');
      expect(convertKsqlTypeToTypeScript('TIME', false)).toBe('string');
      expect(convertKsqlTypeToTypeScript('DECIMAL', false)).toBe('number');
      expect(convertKsqlTypeToTypeScript('BYTES', false)).toBe('Uint8Array');
    });

    test('should handle array types', () => {
      expect(convertKsqlTypeToTypeScript('ARRAY<STRING>', true)).toBe('string[] | null');
    });

    test('should handle map types', () => {
      expect(convertKsqlTypeToTypeScript('MAP<STRING, STRING>', true)).toBe('Record<string, string> | null');
    });

    test('should handle unknown types as any', () => {
      expect(convertKsqlTypeToTypeScript('UNKNOWN_TYPE', false)).toBe('any');
      expect(convertKsqlTypeToTypeScript('UNKNOWN_TYPE', true)).toBe('any | null');
    });
  });

  describe('Name Generation Functions', () => {
    test('generateInterfaceName should create proper interface names', () => {
      expect(generateInterfaceName('users')).toBe('UsersTable');
      expect(generateInterfaceName('user_events')).toBe('UserEventsTable');
      expect(generateInterfaceName('USER_EVENTS')).toBe('UserEventsTable');
      expect(generateInterfaceName('users_table')).toBe('UsersTable'); // 重複を除去
      expect(generateInterfaceName('events_stream')).toBe('EventsTable'); // ストリーム名を修正
    });

    test('generateMapperFunctionName should create proper mapper function names', () => {
      expect(generateMapperFunctionName('users')).toBe('mapUsersTableRow');
      expect(generateMapperFunctionName('user_events')).toBe('mapUserEventsTableRow');
      expect(generateMapperFunctionName('users_table')).toBe('mapUsersTableRow'); // 重複を除去
    });

    test('generateColumnConstantName should create proper constant names', () => {
      expect(generateColumnConstantName('users')).toBe('USERS_COLUMNS');
      expect(generateColumnConstantName('user_events')).toBe('USER_EVENTS_COLUMNS');
      expect(generateColumnConstantName('users_table')).toBe('USERS_COLUMNS'); // 重複を除去
    });
  });

  describe('Code Generation Functions', () => {
    let mockSchema: SchemaInfo;

    beforeEach(() => {
      const columns: ColumnInfo[] = [
        { name: 'ID', type: 'STRING', nullable: false, key: true },
        { name: 'TITLE', type: 'STRING', nullable: true, key: false },
        { name: 'CATEGORY', type: 'STRING', nullable: true, key: false },
        { name: 'STATUS', type: 'STRING', nullable: false, key: false },
        { name: 'CONTENT', type: 'STRING', nullable: true, key: false },
        { name: 'CREATED_AT', type: 'TIMESTAMP', nullable: false, key: false },
        { name: 'UPDATED_AT', type: 'TIMESTAMP', nullable: false, key: false },
        { name: 'PUBLISHED_AT', type: 'TIMESTAMP', nullable: true, key: false },
        { name: 'AUTHOR', type: 'STRING', nullable: true, key: false },
        { name: 'TAGS', type: 'ARRAY<STRING>', nullable: true, key: false },
      ];

      const tableInfo: TableInfo = {
        name: 'OSHIETE_SOURCES_TABLE',
        type: 'TABLE',
        topic: 'oshiete-sources',
        keyFormat: 'KAFKA',
        valueFormat: 'JSON',
        isWindowed: false,
      };

      mockSchema = {
        tableName: 'OSHIETE_SOURCES_TABLE',
        columns,
        tableInfo,
      };
    });

    test('generateTypeScriptInterface should create valid TypeScript interface', () => {
      const result = generateTypeScriptInterface(mockSchema);
      
      // インターフェース名が正しいかチェック
      expect(result).toContain('export interface OshieteSourcesTable');
      
      // フィールドが含まれているかチェック
      expect(result).toContain('id: string;');
      expect(result).toContain('title: string | null;');
      expect(result).toContain('category: string | null;');
      expect(result).toContain('status: string;');
      expect(result).toContain('created_at: string;');
      expect(result).toContain('tags: string[] | null;');
      
      // コメントが含まれているかチェック
      expect(result).toContain('/** STRING');
      expect(result).toContain('/** ARRAY<STRING> (nullable)');
      
      console.log('Generated Interface:');
      console.log(result);
    });

    test('generateMapperFunction should create valid mapper function', () => {
      const result = generateMapperFunction(mockSchema);
      
      // 関数名が正しいかチェック
      expect(result).toContain('export function mapOshieteSourcesTableRow');
      expect(result).toContain('row: any[]');
      expect(result).toContain('OshieteSourcesTable');
      
      // マッピングが含まれているかチェック
      expect(result).toContain('id: row[0]');
      expect(result).toContain('title: row[1]');
      expect(result).toContain('tags: row[9]');
      
      console.log('Generated Mapper:');
      console.log(result);
    });

    test('generateColumnMetadata should create valid column metadata', () => {
      const result = generateColumnMetadata(mockSchema);
      
      // 定数名が正しいかチェック
      expect(result).toContain('export const OSHIETE_SOURCES_COLUMNS');
      
      // カラム名が含まれているかチェック
      expect(result).toContain("'ID'");
      expect(result).toContain("'TITLE'");
      expect(result).toContain("'TAGS'");
      
      // 型情報が含まれているかチェック
      expect(result).toContain("'STRING'");
      expect(result).toContain("'TIMESTAMP'");
      expect(result).toContain("'ARRAY<STRING>'");
      
      // null許可フラグが含まれているかチェック
      expect(result).toContain('nullable: [false, true, true');
      
      // キーフラグが含まれているかチェック
      expect(result).toContain('keyColumns: [true, false, false');
      
      console.log('Generated Metadata:');
      console.log(result);
    });

    test('generateCompleteTypeDefinition should create complete type definition', () => {
      const result = generateCompleteTypeDefinition(mockSchema);
      
      // すべての要素が含まれているかチェック
      expect(result.interfaceName).toBe('OshieteSourcesTable');
      expect(result.mapperFunctionName).toBe('mapOshieteSourcesTableRow');
      
      expect(result.interfaceCode).toContain('export interface OshieteSourcesTable');
      expect(result.mapperCode).toContain('export function mapOshieteSourcesTableRow');
      expect(result.columnMetadata).toContain('export const OSHIETE_SOURCES_COLUMNS');
      
      // 完全なコードに全てが含まれているかチェック
      expect(result.fullCode).toContain('export interface OshieteSourcesTable');
      expect(result.fullCode).toContain('export function mapOshieteSourcesTableRow');
      expect(result.fullCode).toContain('export const OSHIETE_SOURCES_COLUMNS');
      expect(result.fullCode).toContain('export type OSHIETE_SOURCES_TABLE_TYPE = OshieteSourcesTable;');
      
      // 生成日時コメントが含まれているかチェック
      expect(result.fullCode).toContain('Generated on:');
      expect(result.fullCode).toContain('DO NOT EDIT - This file is auto-generated');
      
      console.log('Complete Type Definition:');
      console.log(result.fullCode);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty table names gracefully', () => {
      expect(generateInterfaceName('')).toBe('Table');
      expect(generateMapperFunctionName('')).toBe('mapTableRow');
      expect(generateColumnConstantName('')).toBe('_COLUMNS');
    });

    test('should handle special characters in table names', () => {
      expect(generateInterfaceName('user-events')).toBe('UserEventsTable');
      expect(generateInterfaceName('user@events')).toBe('UserEventsTable');
      expect(generateInterfaceName('user.events')).toBe('UserEventsTable');
    });

    test('should handle very long table names', () => {
      const longName = 'very_long_table_name_with_many_words_that_could_cause_issues';
      const interfaceName = generateInterfaceName(longName);
      
      expect(interfaceName).toContain('VeryLongTableNameWithManyWordsThatCouldCauseIssuesTable');
      expect(interfaceName.length).toBeGreaterThan(10);
    });
  });

  describe('Real-world Schema Examples', () => {
    test('should handle user table schema', () => {
      const userSchema: SchemaInfo = {
        tableName: 'USERS_TABLE',
        columns: [
          { name: 'USER_ID', type: 'STRING', nullable: false, key: true },
          { name: 'EMAIL', type: 'STRING', nullable: false, key: false },
          { name: 'NAME', type: 'STRING', nullable: true, key: false },
          { name: 'AGE', type: 'INTEGER', nullable: true, key: false },
          { name: 'IS_ACTIVE', type: 'BOOLEAN', nullable: false, key: false },
          { name: 'CREATED_AT', type: 'TIMESTAMP', nullable: false, key: false },
          { name: 'METADATA', type: 'MAP<STRING, STRING>', nullable: true, key: false },
          { name: 'TAGS', type: 'ARRAY<STRING>', nullable: true, key: false },
        ],
        tableInfo: {
          name: 'USERS_TABLE',
          type: 'TABLE',
          topic: 'users',
          keyFormat: 'KAFKA',
          valueFormat: 'AVRO',
          isWindowed: false,
        },
      };

      const result = generateCompleteTypeDefinition(userSchema);
      
      expect(result.interfaceName).toBe('UsersTable');
      expect(result.fullCode).toContain('user_id: string;');
      expect(result.fullCode).toContain('email: string;');
      expect(result.fullCode).toContain('name: string | null;');
      expect(result.fullCode).toContain('age: number | null;');
      expect(result.fullCode).toContain('is_active: boolean;');
      expect(result.fullCode).toContain('metadata: Record<string, string> | null;');
      expect(result.fullCode).toContain('tags: string[] | null;');
      
      console.log('User Table Definition:');
      console.log(result.fullCode);
    });
  });
}); 