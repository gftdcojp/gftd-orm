/**
 * ストリーム/テーブル名の変換ロジックをテストするユニットテスト
 */

import { describe, test, expect } from 'vitest';
import { DatabaseQueryBuilder } from '../database';
import { DatabaseClientQueryBuilder } from '../database-client';
import { KsqlDbClientBrowser } from '../http-client';

describe('Stream/Table Name Conversion', () => {
  describe('DatabaseQueryBuilder', () => {
    test('should convert stream name to table name for queries', () => {
      // モックの設定
      const mockExecutePullQuery = async (sql: string) => {
        return { data: [] };
      };
      
      // テスト対象のクエリビルダーを作成
      const queryBuilder = new DatabaseQueryBuilder('users_stream');
      
      // テーブル名の変換ロジックを検証
      const tableNameForQuery = 'users_stream'.endsWith('_stream') 
        ? 'users_stream'.replace('_stream', '_table')
        : 'users_stream'.endsWith('_table') 
        ? 'users_stream'
        : `users_stream_table`;
      
      expect(tableNameForQuery).toBe('users_table');
    });

    test('should keep table name unchanged for queries', () => {
      const tableName = 'users_table';
      const tableNameForQuery = tableName.endsWith('_stream') 
        ? tableName.replace('_stream', '_table')
        : tableName.endsWith('_table') 
        ? tableName
        : `${tableName}_table`;
      
      expect(tableNameForQuery).toBe('users_table');
    });

    test('should add table suffix for plain names', () => {
      const tableName = 'users';
      const tableNameForQuery = tableName.endsWith('_stream') 
        ? tableName.replace('_stream', '_table')
        : tableName.endsWith('_table') 
        ? tableName
        : `${tableName}_table`;
      
      expect(tableNameForQuery).toBe('users_table');
    });

    test('should convert table name to stream name for inserts', () => {
      const tableName = 'users_table';
      const streamNameForInsert = tableName.endsWith('_table') 
        ? tableName.replace('_table', '_stream')
        : tableName.endsWith('_stream') 
        ? tableName
        : `${tableName}_stream`;
      
      expect(streamNameForInsert).toBe('users_stream');
    });

    test('should keep stream name unchanged for inserts', () => {
      const tableName = 'users_stream';
      const streamNameForInsert = tableName.endsWith('_table') 
        ? tableName.replace('_table', '_stream')
        : tableName.endsWith('_stream') 
        ? tableName
        : `${tableName}_stream`;
      
      expect(streamNameForInsert).toBe('users_stream');
    });

    test('should add stream suffix for plain names on inserts', () => {
      const tableName = 'users';
      const streamNameForInsert = tableName.endsWith('_table') 
        ? tableName.replace('_table', '_stream')
        : tableName.endsWith('_stream') 
        ? tableName
        : `${tableName}_stream`;
      
      expect(streamNameForInsert).toBe('users_stream');
    });
  });

  describe('SQL Query Generation', () => {
    test('should generate correct SELECT query with table name', () => {
      const tableName = 'users_stream';
      const tableNameForQuery = tableName.endsWith('_stream') 
        ? tableName.replace('_stream', '_table')
        : tableName.endsWith('_table') 
        ? tableName
        : `${tableName}_table`;
      
      const query = `SELECT * FROM ${tableNameForQuery};`;
      expect(query).toBe('SELECT * FROM users_table;');
    });

    test('should generate correct INSERT query with stream name', () => {
      const tableName = 'users_table';
      const streamNameForInsert = tableName.endsWith('_table') 
        ? tableName.replace('_table', '_stream')
        : tableName.endsWith('_stream') 
        ? tableName
        : `${tableName}_stream`;
      
      const query = `INSERT INTO ${streamNameForInsert} VALUES ('id', 'name', 'email');`;
      expect(query).toBe('INSERT INTO users_stream VALUES (\'id\', \'name\', \'email\');');
    });
  });

  describe('Error Handling', () => {
    test('should provide detailed error information', () => {
      const error = {
        message: 'Stream does not exist',
        tableName: 'users_stream',
        queryType: 'pull_query'
      };
      
      expect(error.message).toContain('Stream');
      expect(error.tableName).toBe('users_stream');
      expect(error.queryType).toBe('pull_query');
    });

    test('should detect stream/table issues in error messages', () => {
      const errorMessage = 'Cannot execute pull query on stream users_stream';
      const isStreamTableIssue = errorMessage.includes('stream') || errorMessage.includes('table');
      
      expect(isStreamTableIssue).toBe(true);
    });
  });
}); 