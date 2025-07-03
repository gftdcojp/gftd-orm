/**
 * RLS ポリシー層 - definePolicy(model, (ctx) => SQLFilter) で行レベルフィルタを登録
 */

import { PolicyFunction, ExecutionContext } from './types';

/**
 * モデルごとのポリシーレジストリ
 */
const policyRegistry = new Map<string, PolicyFunction[]>();

/**
 * ポリシー定義関数 - 設計案の通り
 */
export function definePolicy(
  modelName: string,
  policyFunction: PolicyFunction
): void {
  if (!policyRegistry.has(modelName)) {
    policyRegistry.set(modelName, []);
  }

  const policies = policyRegistry.get(modelName)!;
  policies.push(policyFunction);
}

/**
 * モデルに対するポリシーを取得し、SQL WHERE 句として実行
 */
export function getPoliciesForModel(modelName: string): string[] {
  const policyFunctions = policyRegistry.get(modelName) || [];
  
  // 実行コンテキストがない場合は空の配列を返す
  const ctx = getCurrentExecutionContext();
  if (!ctx) {
    return [];
  }

  return policyFunctions.map(fn => fn(ctx));
}

/**
 * 複数のポリシーを結合（デフォルトは AND 結合）
 */
export function combinePolicies(
  policies: string[],
  operator: 'AND' | 'OR' = 'AND'
): string {
  if (policies.length === 0) {
    return '';
  }

  if (policies.length === 1) {
    return policies[0];
  }

  return `(${policies.join(` ${operator} `)})`;
}

/**
 * 特定のモデルのポリシーをクリア
 */
export function clearPoliciesForModel(modelName: string): void {
  policyRegistry.delete(modelName);
}

/**
 * 全ポリシーをクリア（テスト用）
 */
export function clearAllPolicies(): void {
  policyRegistry.clear();
}

/**
 * 登録済みポリシー一覧を取得
 */
export function getAllRegisteredPolicies(): Record<string, PolicyFunction[]> {
  const result: Record<string, PolicyFunction[]> = {};
  
  for (const [modelName, policies] of policyRegistry.entries()) {
    result[modelName] = [...policies];
  }
  
  return result;
}

/**
 * 現在の実行コンテキストを取得
 * 実際の実装では、リクエストコンテキストやスレッドローカルストレージから取得
 */
function getCurrentExecutionContext(): ExecutionContext | null {
  // 簡略化：実際の実装では、Express.js のミドルウェアやコンテキスト管理ライブラリを使用
  // 例：AsyncLocalStorage や request-context など
  
  // グローバル変数から取得（デモ用）
  return (global as any).__currentExecutionContext || null;
}

/**
 * 実行コンテキストを設定（デモ用）
 */
export function setCurrentExecutionContext(ctx: ExecutionContext): void {
  (global as any).__currentExecutionContext = ctx;
}

/**
 * 実行コンテキストをクリア
 */
export function clearCurrentExecutionContext(): void {
  delete (global as any).__currentExecutionContext;
}

/**
 * ポリシーのテスト実行
 */
export function testPolicy(
  modelName: string,
  context: ExecutionContext
): string[] {
  const policyFunctions = policyRegistry.get(modelName) || [];
  return policyFunctions.map(fn => fn(context));
}

/**
 * ポリシーの動的結合（条件に応じてAND/ORを切り替え）
 */
export function buildDynamicPolicyCondition(
  modelName: string,
  context: ExecutionContext,
  options: {
    operator?: 'AND' | 'OR';
    wrapInParentheses?: boolean;
  } = {}
): string {
  const { operator = 'AND', wrapInParentheses = true } = options;
  
  const policyFunctions = policyRegistry.get(modelName) || [];
  const conditions = policyFunctions.map(fn => fn(context));
  
  if (conditions.length === 0) {
    return '';
  }
  
  if (conditions.length === 1) {
    return conditions[0];
  }
  
  const combined = conditions.join(` ${operator} `);
  return wrapInParentheses ? `(${combined})` : combined;
}

/**
 * ポリシーをWHERE句に適用するヘルパー
 */
export function applyPoliciesToWhere(
  baseWhere: string,
  modelName: string,
  context: ExecutionContext,
  options: {
    operator?: 'AND' | 'OR';
    policyOperator?: 'AND' | 'OR';
  } = {}
): string {
  const { operator = 'AND', policyOperator = 'AND' } = options;
  
  const policyCondition = buildDynamicPolicyCondition(modelName, context, {
    operator: policyOperator,
  });
  
  if (!policyCondition) {
    return baseWhere;
  }
  
  if (!baseWhere) {
    return policyCondition;
  }
  
  return `${baseWhere} ${operator} ${policyCondition}`;
} 