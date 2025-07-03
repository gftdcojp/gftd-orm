/**
 * クエリビルダーのテスト
 */

import { describe, test, expect } from 'vitest';
import { buildSelectQuery, buildInsertQuery, buildUpdateQuery, buildDeleteQuery } from '../query-builder';

describe('Query Builder', () => {
  describe('buildSelectQuery', () => {
    test('should build basic SELECT query', () => {
      const query = buildSelectQuery('users', ['id', 'name']);
      expect(query).toBe('SELECT id, name FROM users;');
    });

    test('should build SELECT query with WHERE clause', () => {
      const query = buildSelectQuery('users', ['*'], { id: 'user-123' });
      expect(query).toBe("SELECT * FROM users WHERE id = 'user-123';");
    });

    test('should build SELECT query with complex WHERE conditions', () => {
      const query = buildSelectQuery('users', ['*'], {
        age: { gte: 18 },
        status: { in: ['active', 'premium'] }
      });
      expect(query).toContain('WHERE age >= 18 AND status IN (');
    });

    test('should build SELECT query with ORDER BY', () => {
      const query = buildSelectQuery('users', ['*'], undefined, { created: 'desc' });
      expect(query).toBe('SELECT * FROM users ORDER BY created DESC;');
    });

    test('should build SELECT query with LIMIT', () => {
      const query = buildSelectQuery('users', ['*'], undefined, undefined, 10);
      expect(query).toBe('SELECT * FROM users LIMIT 10;');
    });

    test('should build SELECT query with OFFSET', () => {
      const query = buildSelectQuery('users', ['*'], undefined, undefined, 10, 5);
      expect(query).toBe('SELECT * FROM users LIMIT 10 OFFSET 5;');
    });

    test('should build complex SELECT query', () => {
      const query = buildSelectQuery(
        'users',
        ['id', 'name', 'email'],
        { status: 'active', tenantId: 'tenant-123' },
        { created: 'desc' },
        20,
        10
      );
      expect(query).toContain('SELECT id, name, email FROM users');
      expect(query).toContain('WHERE');
      expect(query).toContain('ORDER BY created DESC');
      expect(query).toContain('LIMIT 20');
      expect(query).toContain('OFFSET 10');
    });
  });

  describe('buildInsertQuery', () => {
    test('should build basic INSERT query', () => {
      const query = buildInsertQuery('users', {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com'
      });
      expect(query).toBe("INSERT INTO users (id, name, email) VALUES ('user-123', 'John Doe', 'john@example.com');");
    });

    test('should handle null values', () => {
      const query = buildInsertQuery('users', {
        id: 'user-123',
        name: 'John Doe',
        description: null
      });
      expect(query).toBe("INSERT INTO users (id, name, description) VALUES ('user-123', 'John Doe', NULL);");
    });

    test('should handle different data types', () => {
      const query = buildInsertQuery('users', {
        id: 'user-123',
        name: 'John Doe',
        age: 30,
        active: true,
        created: new Date('2023-01-01T00:00:00.000Z')
      });
      expect(query).toContain('30');
      expect(query).toContain('TRUE');
      expect(query).toContain('2023-01-01T00:00:00.000Z');
    });
  });

  describe('buildUpdateQuery', () => {
    test('should build basic UPDATE query', () => {
      const query = buildUpdateQuery('users', { id: 'user-123' }, { name: 'Jane Doe' });
      expect(query).toBe("UPDATE users SET name = 'Jane Doe' WHERE id = 'user-123';");
    });

    test('should handle multiple SET clauses', () => {
      const query = buildUpdateQuery('users', { id: 'user-123' }, {
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 25
      });
      expect(query).toContain('SET name = ');
      expect(query).toContain('email = ');
      expect(query).toContain('age = 25');
    });
  });

  describe('buildDeleteQuery', () => {
    test('should build basic DELETE query', () => {
      const query = buildDeleteQuery('users', { id: 'user-123' });
      expect(query).toBe("DELETE FROM users WHERE id = 'user-123';");
    });

    test('should handle multiple WHERE conditions', () => {
      const query = buildDeleteQuery('users', {
        tenantId: 'tenant-123',
        status: 'inactive'
      });
      expect(query).toContain('WHERE tenantId = ');
      expect(query).toContain('status = ');
    });
  });

  describe('SQL Injection Protection', () => {
    test('should escape single quotes in strings', () => {
      const query = buildInsertQuery('users', {
        name: "O'Connor",
        description: "User's description"
      });
      // SQLインジェクション対策でエスケープされるはず
      expect(query).not.toContain("O'Connor");
      expect(query).not.toContain("User's description");
    });

    test('should reject dangerous SQL patterns', () => {
      expect(() => {
        buildInsertQuery('users', {
          name: 'John; DROP TABLE users; --'
        });
      }).toThrow();
    });
  });
}); 