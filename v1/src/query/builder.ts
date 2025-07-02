import { 
  KsqlStreamDefinition, 
  KsqlTableDefinition, 
  WhereCondition, 
  OrderByClause,
  KsqlValue 
} from '../types';
import { KsqlDBClient } from '../core/client';

export class QueryBuilder<T = any> {
  private selectFields: string[] = ['*'];
  private fromSource: string;
  private whereConditions: WhereCondition[] = [];
  private orderByClauses: OrderByClause[] = [];
  private groupByFields: string[] = [];
  private havingCondition?: WhereCondition;
  private limitValue?: number;
  private offsetValue?: number;
  private emitChangesFlag = false;
  private windowType?: 'TUMBLING' | 'HOPPING' | 'SESSION';
  private windowSize?: string;

  constructor(
    private client: KsqlDBClient,
    source: KsqlStreamDefinition | KsqlTableDefinition
  ) {
    this.fromSource = source.name;
  }

  select(...fields: string[]): this {
    this.selectFields = fields.length > 0 ? fields : ['*'];
    return this;
  }

  where(condition: WhereCondition | ((builder: WhereBuilder) => WhereBuilder)): this {
    if (typeof condition === 'function') {
      const whereBuilder = new WhereBuilder();
      condition(whereBuilder);
      this.whereConditions.push(...whereBuilder.getConditions());
    } else {
      this.whereConditions.push(condition);
    }
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClauses.push({ column, direction });
    return this;
  }

  groupBy(...columns: string[]): this {
    this.groupByFields = columns;
    return this;
  }

  having(condition: WhereCondition): this {
    this.havingCondition = condition;
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  emitChanges(): this {
    this.emitChangesFlag = true;
    return this;
  }

  window(type: 'TUMBLING' | 'HOPPING' | 'SESSION', size: string): this {
    this.windowType = type;
    this.windowSize = size;
    return this;
  }

  private buildWhereClause(conditions: WhereCondition[]): string {
    if (conditions.length === 0) return '';

    const clauses = conditions.map(cond => {
      switch (cond.operator) {
        case 'IS NULL':
        case 'IS NOT NULL':
          return `${cond.column} ${cond.operator}`;
        case 'IN':
        case 'NOT IN':
          const values = cond.values?.map(v => this.formatValue(v)).join(', ');
          return `${cond.column} ${cond.operator} (${values})`;
        case 'LIKE':
          return `${cond.column} ${cond.operator} ${this.formatValue(cond.value!)}`;
        default:
          return `${cond.column} ${cond.operator} ${this.formatValue(cond.value!)}`;
      }
    });

    return `WHERE ${clauses.join(' AND ')}`;
  }

  private formatValue(value: KsqlValue): string {
    if (value === null) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (Array.isArray(value)) return `ARRAY[${value.map(v => this.formatValue(v)).join(', ')}]`;
    if (typeof value === 'object') return `'${JSON.stringify(value)}'`;
    return String(value);
  }

  build(): string {
    let query = `SELECT ${this.selectFields.join(', ')} FROM ${this.fromSource}`;

    if (this.windowType && this.windowSize) {
      query += ` WINDOW ${this.windowType} (SIZE ${this.windowSize})`;
    }

    const whereClause = this.buildWhereClause(this.whereConditions);
    if (whereClause) {
      query += ` ${whereClause}`;
    }

    if (this.groupByFields.length > 0) {
      query += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    if (this.havingCondition) {
      query += ` HAVING ${this.buildWhereClause([this.havingCondition]).replace('WHERE ', '')}`;
    }

    if (this.orderByClauses.length > 0) {
      const orderBy = this.orderByClauses
        .map(clause => `${clause.column} ${clause.direction || 'ASC'}`)
        .join(', ');
      query += ` ORDER BY ${orderBy}`;
    }

    if (this.limitValue !== undefined) {
      query += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      query += ` OFFSET ${this.offsetValue}`;
    }

    if (this.emitChangesFlag) {
      query += ' EMIT CHANGES';
    }

    return query + ';';
  }

  async execute(): Promise<T[]> {
    const query = this.build();
    return this.client.query<T>(query);
  }

  async stream(
    onMessage: (message: T) => void,
    onError?: (error: Error) => void
  ): Promise<() => void> {
    const query = this.build();
    return this.client.stream<T>(query, onMessage, onError);
  }
}

export class WhereBuilder {
  private conditions: WhereCondition[] = [];

  eq(column: string, value: KsqlValue): this {
    this.conditions.push({ column, operator: '=', value });
    return this;
  }

  neq(column: string, value: KsqlValue): this {
    this.conditions.push({ column, operator: '!=', value });
    return this;
  }

  gt(column: string, value: KsqlValue): this {
    this.conditions.push({ column, operator: '>', value });
    return this;
  }

  gte(column: string, value: KsqlValue): this {
    this.conditions.push({ column, operator: '>=', value });
    return this;
  }

  lt(column: string, value: KsqlValue): this {
    this.conditions.push({ column, operator: '<', value });
    return this;
  }

  lte(column: string, value: KsqlValue): this {
    this.conditions.push({ column, operator: '<=', value });
    return this;
  }

  like(column: string, pattern: string): this {
    this.conditions.push({ column, operator: 'LIKE', value: pattern });
    return this;
  }

  in(column: string, values: KsqlValue[]): this {
    this.conditions.push({ column, operator: 'IN', values });
    return this;
  }

  notIn(column: string, values: KsqlValue[]): this {
    this.conditions.push({ column, operator: 'NOT IN', values });
    return this;
  }

  isNull(column: string): this {
    this.conditions.push({ column, operator: 'IS NULL' });
    return this;
  }

  isNotNull(column: string): this {
    this.conditions.push({ column, operator: 'IS NOT NULL' });
    return this;
  }

  getConditions(): WhereCondition[] {
    return this.conditions;
  }
}