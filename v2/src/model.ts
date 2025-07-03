/**
 * モデル定義層 - defineModel() でスキーマを流用し、ksqlDB Stream/Table 定義
 */

import { SchemaDefinition, InferSchemaType } from './schema';
import { StreamType, SqlOptions, FindManyOptions, WhereCondition, OrderByCondition } from './types';
import { BaseFieldType } from './field-types';
import { buildSelectQuery, buildInsertQuery, buildUpdateQuery, buildDeleteQuery } from './query-builder';
import { executeQuery } from './ksqldb-client';
import { getPoliciesForModel } from './policy';
import { getExecutionContext } from './context';

export interface ModelDefinition<T extends Record<string, BaseFieldType>> {
  schema: SchemaDefinition;
  type: StreamType;
  topic: string;
  key: string;
  sqlOptions?: SqlOptions;
  tableName: string;
}

export interface Model<T extends Record<string, BaseFieldType>> {
  definition: ModelDefinition<T>;
  findMany(options?: FindManyOptions): Promise<InferSchemaType<T>[]>;
  findFirst(options?: FindManyOptions): Promise<InferSchemaType<T> | null>;
  findById(id: any): Promise<InferSchemaType<T> | null>;
  insert(data: Partial<InferSchemaType<T>>): Promise<InferSchemaType<T>>;
  update(where: WhereCondition, data: Partial<InferSchemaType<T>>): Promise<number>;
  delete(where: WhereCondition): Promise<number>;
  count(where?: WhereCondition): Promise<number>;
}

/**
 * モデル定義のレジストリ
 */
const modelRegistry = new Map<string, Model<any>>();

/**
 * モデル定義関数 - 設計案の通り
 */
export function defineModel<T extends Record<string, BaseFieldType>>(config: {
  schema: SchemaDefinition;
  type: StreamType;
  topic: string;
  key: string;
  sqlOptions?: SqlOptions;
}): Model<T> {
  const tableName = config.type === StreamType.TABLE 
    ? `${config.topic}_table` 
    : `${config.topic}_stream`;

  const definition: ModelDefinition<T> = {
    ...config,
    tableName,
  };

  const model: Model<T> = {
    definition,

    async findMany(options: FindManyOptions = {}): Promise<InferSchemaType<T>[]> {
      const ctx = getExecutionContext();
      const policies = getPoliciesForModel(definition.schema.name);
      
      // RLS ポリシーを WHERE 句に注入
      const enhancedWhere = applyPolicies(options.where, policies, ctx);
      
      const query = buildSelectQuery(
        tableName,
        Object.keys(definition.schema.fields),
        enhancedWhere,
        options.orderBy,
        options.limit,
        options.offset
      );

      const result = await executeQuery(query);
      return parseQueryResult(result);
    },

    async findFirst(options: FindManyOptions = {}): Promise<InferSchemaType<T> | null> {
      const results = await this.findMany({ ...options, limit: 1 });
      return results.length > 0 ? results[0] : null;
    },

    async findById(id: any): Promise<InferSchemaType<T> | null> {
      return this.findFirst({ where: { [config.key]: id } });
    },

    async insert(data: Partial<InferSchemaType<T>>): Promise<InferSchemaType<T>> {
      const ctx = getExecutionContext();
      const policies = getPoliciesForModel(definition.schema.name);
      
      // RLS ポリシーチェック（insert時）
      validateInsertData(data, policies, ctx);

      const query = buildInsertQuery(config.topic, data);
      await executeQuery(query);
      
      // 挿入されたデータを返す（簡略化）
      return data as InferSchemaType<T>;
    },

    async update(where: WhereCondition, data: Partial<InferSchemaType<T>>): Promise<number> {
      const ctx = getExecutionContext();
      const policies = getPoliciesForModel(definition.schema.name);
      
      // RLS ポリシーを WHERE 句に注入
      const enhancedWhere = applyPolicies(where, policies, ctx);
      
      const query = buildUpdateQuery(tableName, enhancedWhere, data);
      const result = await executeQuery(query);
      
      // 更新件数を返す（ksqlDBの制約により簡略化）
      return 1;
    },

    async delete(where: WhereCondition): Promise<number> {
      const ctx = getExecutionContext();
      const policies = getPoliciesForModel(definition.schema.name);
      
      // RLS ポリシーを WHERE 句に注入
      const enhancedWhere = applyPolicies(where, policies, ctx);
      
      const query = buildDeleteQuery(tableName, enhancedWhere);
      const result = await executeQuery(query);
      
      // 削除件数を返す（ksqlDBの制約により簡略化）
      return 1;
    },

    async count(where?: WhereCondition): Promise<number> {
      const ctx = getExecutionContext();
      const policies = getPoliciesForModel(definition.schema.name);
      
      // RLS ポリシーを WHERE 句に注入
      const enhancedWhere = applyPolicies(where, policies, ctx);
      
      const query = buildSelectQuery(
        tableName,
        ['COUNT(*) as count'],
        enhancedWhere
      );

      const result = await executeQuery(query);
      const parsed = parseQueryResult(result);
      return parsed[0]?.count || 0;
    },
  };

  // レジストリに登録
  modelRegistry.set(definition.schema.name, model);

  return model;
}

/**
 * RLS ポリシーを WHERE 句に適用
 */
function applyPolicies(
  where: WhereCondition | undefined, 
  policies: string[], 
  ctx: any
): WhereCondition {
  if (policies.length === 0) {
    return where || {};
  }

  const policyConditions = policies.join(' AND ');
  
  if (!where) {
    return { _rlsPolicy: policyConditions };
  }

  return {
    ...where,
    _rlsPolicy: policyConditions,
  };
}

/**
 * Insert データのバリデーション（RLS）
 */
function validateInsertData(data: any, policies: string[], ctx: any): void {
  // 簡略化：実際の実装では、ポリシーをチェックしてデータが適合するか確認
  // 例：tenantId が現在のユーザーのものと一致するかなど
}

/**
 * クエリ結果のパース
 */
function parseQueryResult(result: any): any[] {
  // ksqlDB REST API のレスポンス形式に合わせて実装
  if (result && result.rows) {
    return result.rows.map((row: any[]) => {
      // 簡略化：実際の実装では、スキーマに基づいて適切にパース
      return row;
    });
  }
  return [];
}

/**
 * 登録済みモデルを取得
 */
export function getModel(name: string): Model<any> | undefined {
  return modelRegistry.get(name);
}

/**
 * 全モデルを取得
 */
export function getAllModels(): Model<any>[] {
  return Array.from(modelRegistry.values());
} 