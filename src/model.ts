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
  // データ取得用のテーブル名とデータ挿入用のストリーム名を明確に分離
  const tableName = `${config.topic}_table`;
  const streamName = `${config.topic}_stream`;

  const definition: ModelDefinition<T> = {
    ...config,
    tableName,
  };

  const model: Model<T> = {
    definition,

    async findMany(options: FindManyOptions = {}): Promise<InferSchemaType<T>[]> {
      try {
        const ctx = getExecutionContext();
        const policies = getPoliciesForModel(definition.schema.name);
        
        // RLS ポリシーを WHERE 句に注入
        const enhancedWhere = applyPolicies(options.where, policies, ctx);
        
        // データ取得はテーブルに対してプルクエリを実行
        const query = buildSelectQuery(
          tableName, // 常にテーブル名を使用
          Object.keys(definition.schema.fields),
          enhancedWhere,
          options.orderBy,
          options.limit,
          options.offset
        );

        console.log(`[DEBUG] Model.findMany - Table: ${tableName}, Query: ${query}`);

        const { executePullQuery } = await import('./ksqldb-client');
        const result = await executePullQuery(query);
        return parseQueryResult(result);
      } catch (error: any) {
        console.error(`[ERROR] Model.findMany failed:`, error);
        console.error(`[ERROR] Model: ${definition.schema.name}, Table: ${tableName}`);
        throw new Error(`Find many failed for model ${definition.schema.name}: ${error.message}`);
      }
    },

    async findFirst(options: FindManyOptions = {}): Promise<InferSchemaType<T> | null> {
      try {
        const results = await this.findMany({ ...options, limit: 1 });
        return results.length > 0 ? results[0] : null;
      } catch (error: any) {
        console.error(`[ERROR] Model.findFirst failed:`, error);
        throw new Error(`Find first failed for model ${definition.schema.name}: ${error.message}`);
      }
    },

    async findById(id: any): Promise<InferSchemaType<T> | null> {
      try {
        return this.findFirst({ where: { [config.key]: id } });
      } catch (error: any) {
        console.error(`[ERROR] Model.findById failed:`, error);
        throw new Error(`Find by ID failed for model ${definition.schema.name}: ${error.message}`);
      }
    },

    async insert(data: Partial<InferSchemaType<T>>): Promise<InferSchemaType<T>> {
      try {
        const ctx = getExecutionContext();
        const policies = getPoliciesForModel(definition.schema.name);
        
        // RLS ポリシーチェック（insert時）
        validateInsertData(data, policies, ctx);

        // データ挿入はストリームに対して実行
        const query = buildInsertQuery(streamName, data); // ストリーム名を使用
        
        console.log(`[DEBUG] Model.insert - Stream: ${streamName}, Query: ${query}`);

        await executeQuery(query);
        
        // 挿入されたデータを返す（簡略化）
        return data as InferSchemaType<T>;
      } catch (error: any) {
        console.error(`[ERROR] Model.insert failed:`, error);
        console.error(`[ERROR] Model: ${definition.schema.name}, Stream: ${streamName}`);
        console.error(`[ERROR] Data:`, data);
        throw new Error(`Insert failed for model ${definition.schema.name}: ${error.message}`);
      }
    },

    async update(where: WhereCondition, data: Partial<InferSchemaType<T>>): Promise<number> {
      try {
        const ctx = getExecutionContext();
        const policies = getPoliciesForModel(definition.schema.name);
        
        // RLS ポリシーを WHERE 句に注入
        const enhancedWhere = applyPolicies(where, policies, ctx);
        
        // 更新操作はテーブルに対して実行
        const query = buildUpdateQuery(tableName, enhancedWhere, data);
        
        console.log(`[DEBUG] Model.update - Table: ${tableName}, Query: ${query}`);

        const result = await executeQuery(query);
        
        // 更新件数を返す（ksqlDBの制約により簡略化）
        return 1;
      } catch (error: any) {
        console.error(`[ERROR] Model.update failed:`, error);
        console.error(`[ERROR] Model: ${definition.schema.name}, Table: ${tableName}`);
        throw new Error(`Update failed for model ${definition.schema.name}: ${error.message}`);
      }
    },

    async delete(where: WhereCondition): Promise<number> {
      try {
        const ctx = getExecutionContext();
        const policies = getPoliciesForModel(definition.schema.name);
        
        // RLS ポリシーを WHERE 句に注入
        const enhancedWhere = applyPolicies(where, policies, ctx);
        
        // 削除操作はテーブルに対して実行
        const query = buildDeleteQuery(tableName, enhancedWhere);
        
        console.log(`[DEBUG] Model.delete - Table: ${tableName}, Query: ${query}`);

        const result = await executeQuery(query);
        
        // 削除件数を返す（ksqlDBの制約により簡略化）
        return 1;
      } catch (error: any) {
        console.error(`[ERROR] Model.delete failed:`, error);
        console.error(`[ERROR] Model: ${definition.schema.name}, Table: ${tableName}`);
        throw new Error(`Delete failed for model ${definition.schema.name}: ${error.message}`);
      }
    },

    async count(where?: WhereCondition): Promise<number> {
      try {
        const ctx = getExecutionContext();
        const policies = getPoliciesForModel(definition.schema.name);
        
        // RLS ポリシーを WHERE 句に注入
        const enhancedWhere = applyPolicies(where, policies, ctx);
        
        // カウント操作はテーブルに対してプルクエリを実行
        const query = buildSelectQuery(
          tableName, // 常にテーブル名を使用
          ['COUNT(*) as count'],
          enhancedWhere
        );

        console.log(`[DEBUG] Model.count - Table: ${tableName}, Query: ${query}`);

        const { executePullQuery } = await import('./ksqldb-client');
        const result = await executePullQuery(query);
        const parsed = parseQueryResult(result);
        return parsed[0]?.count || 0;
      } catch (error: any) {
        console.error(`[ERROR] Model.count failed:`, error);
        console.error(`[ERROR] Model: ${definition.schema.name}, Table: ${tableName}`);
        throw new Error(`Count failed for model ${definition.schema.name}: ${error.message}`);
      }
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