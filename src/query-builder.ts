/**
 * クエリビルダー層 - ksqlDB の SQL (Pull Query / Push Query) を生成
 */

import { WhereCondition, OrderByCondition } from './types';

/**
 * SELECT クエリを構築
 */
export function buildSelectQuery(
  tableName: string,
  fields: string[],
  where?: WhereCondition,
  orderBy?: OrderByCondition,
  limit?: number,
  offset?: number
): string {
  let query = `SELECT ${fields.join(', ')} FROM ${tableName}`;

  // WHERE 句の構築
  if (where) {
    const whereClause = buildWhereClause(where);
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
  }

  // ORDER BY 句の構築
  if (orderBy) {
    const orderByClause = buildOrderByClause(orderBy);
    if (orderByClause) {
      query += ` ORDER BY ${orderByClause}`;
    }
  }

  // LIMIT 句の構築
  if (limit !== undefined) {
    query += ` LIMIT ${limit}`;
  }

  // OFFSET 句の構築（ksqlDBでは制限があるが追加）
  if (offset !== undefined) {
    query += ` OFFSET ${offset}`;
  }

  return query + ';';
}

/**
 * INSERT クエリを構築（ksqlDB では INSERT INTO stream/table VALUES の形式）
 */
export function buildInsertQuery(topicName: string, data: Record<string, any>): string {
  const fields = Object.keys(data);
  const values = Object.values(data);

  // 値をSQL形式にフォーマット
  const formattedValues = values.map(value => {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`; // SQLインジェクション対策
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return String(value);
  });

  return `INSERT INTO ${topicName} (${fields.join(', ')}) VALUES (${formattedValues.join(', ')});`;
}

/**
 * UPDATE クエリを構築（ksqlDBでは制限があるため、実際にはSTREAMへのINSERTで代替）
 */
export function buildUpdateQuery(
  tableName: string,
  where: WhereCondition,
  data: Record<string, any>
): string {
  const setClause = Object.entries(data)
    .map(([key, value]) => {
      const formattedValue = formatSqlValue(value);
      return `${key} = ${formattedValue}`;
    })
    .join(', ');

  let query = `UPDATE ${tableName} SET ${setClause}`;

  const whereClause = buildWhereClause(where);
  if (whereClause) {
    query += ` WHERE ${whereClause}`;
  }

  return query + ';';
}

/**
 * DELETE クエリを構築（ksqlDBでは制限があるため、実際にはTOMBSTONEレコードで代替）
 */
export function buildDeleteQuery(tableName: string, where: WhereCondition): string {
  let query = `DELETE FROM ${tableName}`;

  const whereClause = buildWhereClause(where);
  if (whereClause) {
    query += ` WHERE ${whereClause}`;
  }

  return query + ';';
}

/**
 * WHERE 句を構築
 */
function buildWhereClause(where: WhereCondition): string {
  const conditions: string[] = [];

  for (const [field, condition] of Object.entries(where)) {
    if (field === '_rlsPolicy') {
      // RLS ポリシーは直接SQL文字列として追加
      conditions.push(condition as string);
      continue;
    }

    if (typeof condition === 'object' && condition !== null) {
      // 条件オブジェクトの場合
      for (const [operator, value] of Object.entries(condition)) {
        const sqlCondition = buildCondition(field, operator, value);
        if (sqlCondition) {
          conditions.push(sqlCondition);
        }
      }
    } else {
      // 単純な等価条件
      const formattedValue = formatSqlValue(condition);
      conditions.push(`${field} = ${formattedValue}`);
    }
  }

  return conditions.join(' AND ');
}

/**
 * 条件を構築
 */
function buildCondition(field: string, operator: string, value: any): string | null {
  const formattedValue = formatSqlValue(value);

  switch (operator) {
    case 'like':
      return `${field} LIKE ${formattedValue}`;
    case 'in':
      if (Array.isArray(value)) {
        const values = value.map(v => formatSqlValue(v)).join(', ');
        return `${field} IN (${values})`;
      }
      return null;
    case 'gt':
      return `${field} > ${formattedValue}`;
    case 'gte':
      return `${field} >= ${formattedValue}`;
    case 'lt':
      return `${field} < ${formattedValue}`;
    case 'lte':
      return `${field} <= ${formattedValue}`;
    case 'eq':
      return `${field} = ${formattedValue}`;
    case 'ne':
      return `${field} != ${formattedValue}`;
    default:
      return null;
  }
}

/**
 * ORDER BY 句を構築
 */
function buildOrderByClause(orderBy: OrderByCondition): string {
  return Object.entries(orderBy)
    .map(([field, direction]) => `${field} ${direction.toUpperCase()}`)
    .join(', ');
}

/**
 * SQL値をフォーマット
 */
function formatSqlValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`; // SQLインジェクション対策
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  return String(value);
} 