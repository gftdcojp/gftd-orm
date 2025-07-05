/**
 * Row Level Security (RLS) システム - ksqlDB用アクセス制御
 */

import { UserPayload } from './jwt-auth';
import { log } from './utils/logger';
import { AuditLogManager, AuditEventType, AuditLogLevel } from './audit-log';

/**
 * RLSポリシーのタイプ
 */
export enum PolicyType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ALL = 'ALL',
}

/**
 * RLSポリシー定義
 */
export interface RLSPolicy {
  id: string;
  name: string;
  tableName: string;
  policyType: PolicyType;
  roles: string[];
  condition: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * クエリ分析結果
 */
interface QueryAnalysis {
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'OTHER';
  tables: string[];
  columns: string[];
  conditions: string[];
  isModifying: boolean;
}

/**
 * RLSマネージャー
 */
export class RLSManager {
  private static instance: RLSManager;
  private policies = new Map<string, RLSPolicy>();
  private tableRLSEnabled = new Set<string>();

  private constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): RLSManager {
    if (!RLSManager.instance) {
      RLSManager.instance = new RLSManager();
    }
    return RLSManager.instance;
  }

  /**
   * デフォルトポリシーを初期化
   */
  private initializeDefaultPolicies(): void {
    // 認証ユーザーの基本ポリシー
    this.createPolicy({
      id: 'authenticated-users-read',
      name: 'Authenticated Users Read',
      tableName: '*',
      policyType: PolicyType.SELECT,
      roles: ['authenticated'],
      condition: 'true', // 認証されたユーザーは読み取り可能
      description: 'Allow authenticated users to read data',
      isActive: true,
    });

    // 匿名ユーザーの制限ポリシー
    this.createPolicy({
      id: 'anon-users-read-public',
      name: 'Anonymous Users Read Public',
      tableName: '*',
      policyType: PolicyType.SELECT,
      roles: ['anon'],
      condition: 'visibility = \'public\'',
      description: 'Allow anonymous users to read only public data',
      isActive: true,
    });

    // 自分のデータのみアクセス可能なポリシー
    this.createPolicy({
      id: 'user-owns-data',
      name: 'User Owns Data',
      tableName: 'user_data',
      policyType: PolicyType.ALL,
      roles: ['authenticated'],
      condition: 'user_id = auth.user_id()',
      description: 'Users can only access their own data',
      isActive: true,
    });

    // サービスロールの全権限ポリシー
    this.createPolicy({
      id: 'service-role-full-access',
      name: 'Service Role Full Access',
      tableName: '*',
      policyType: PolicyType.ALL,
      roles: ['service_role'],
      condition: 'true',
      description: 'Service role has full access to all data',
      isActive: true,
    });

    log.info('Default RLS policies initialized');
  }

  /**
   * ポリシーを作成
   */
  createPolicy(policy: Omit<RLSPolicy, 'createdAt' | 'updatedAt'>): void {
    const newPolicy: RLSPolicy = {
      ...policy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(policy.id, newPolicy);
    log.info(`RLS policy created: ${policy.name} for table ${policy.tableName}`);

    AuditLogManager.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.ADMIN_POLICY_CHANGE,
      result: 'SUCCESS',
      message: `RLS policy created: ${policy.name}`,
      details: { policyId: policy.id, tableName: policy.tableName },
    });
  }

  /**
   * ポリシーを更新
   */
  updatePolicy(id: string, updates: Partial<RLSPolicy>): boolean {
    const policy = this.policies.get(id);
    if (!policy) {
      return false;
    }

    Object.assign(policy, updates, { updatedAt: new Date() });
    log.info(`RLS policy updated: ${policy.name}`);

    AuditLogManager.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.ADMIN_POLICY_CHANGE,
      result: 'SUCCESS',
      message: `RLS policy updated: ${policy.name}`,
      details: { policyId: id, updates },
    });

    return true;
  }

  /**
   * ポリシーを削除
   */
  deletePolicy(id: string): boolean {
    const policy = this.policies.get(id);
    if (!policy) {
      return false;
    }

    this.policies.delete(id);
    log.info(`RLS policy deleted: ${policy.name}`);

    AuditLogManager.log({
      level: AuditLogLevel.INFO,
      eventType: AuditEventType.ADMIN_POLICY_CHANGE,
      result: 'SUCCESS',
      message: `RLS policy deleted: ${policy.name}`,
      details: { policyId: id },
    });

    return true;
  }

  /**
   * テーブルのRLSを有効化
   */
  enableRLS(tableName: string): void {
    this.tableRLSEnabled.add(tableName.toUpperCase());
    log.info(`RLS enabled for table: ${tableName}`);
  }

  /**
   * テーブルのRLSを無効化
   */
  disableRLS(tableName: string): void {
    this.tableRLSEnabled.delete(tableName.toUpperCase());
    log.info(`RLS disabled for table: ${tableName}`);
  }

  /**
   * テーブルのRLS状態を確認
   */
  isRLSEnabled(tableName: string): boolean {
    return this.tableRLSEnabled.has(tableName.toUpperCase());
  }

  /**
   * クエリを分析
   */
  private analyzeQuery(sql: string): QueryAnalysis {
    const upperSQL = sql.toUpperCase();
    
    // 操作タイプを判定
    let operation: QueryAnalysis['operation'] = 'OTHER';
    if (upperSQL.includes('SELECT')) operation = 'SELECT';
    else if (upperSQL.includes('INSERT')) operation = 'INSERT';
    else if (upperSQL.includes('UPDATE')) operation = 'UPDATE';
    else if (upperSQL.includes('DELETE')) operation = 'DELETE';
    else if (upperSQL.includes('CREATE')) operation = 'CREATE';
    else if (upperSQL.includes('DROP')) operation = 'DROP';

    // テーブル名を抽出（簡易的な実装）
    const tableMatches = sql.match(/(?:FROM|INTO|UPDATE|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)/gi);
    const tables = tableMatches ? tableMatches.map(match => 
      match.replace(/(?:FROM|INTO|UPDATE|JOIN)\s+/i, '').trim()
    ) : [];

    // 条件を抽出
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    const conditions = whereMatch ? [whereMatch[1]] : [];

    return {
      operation,
      tables,
      columns: [], // 詳細な列解析は省略
      conditions,
      isModifying: ['INSERT', 'UPDATE', 'DELETE'].includes(operation),
    };
  }

  /**
   * 適用可能なポリシーを取得
   */
  private getApplicablePolicies(tableName: string, operation: string, userRole: string): RLSPolicy[] {
    const policies: RLSPolicy[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.isActive) continue;
      
      // テーブル名のマッチング
      if (policy.tableName !== '*' && policy.tableName.toUpperCase() !== tableName.toUpperCase()) {
        continue;
      }

      // 操作タイプのマッチング
      if (policy.policyType !== PolicyType.ALL && policy.policyType !== operation) {
        continue;
      }

      // ロールのマッチング
      if (!policy.roles.includes(userRole)) {
        continue;
      }

      policies.push(policy);
    }

    return policies;
  }

  /**
   * 条件をクエリに適用
   */
  private applyConditionsToQuery(sql: string, conditions: string[]): string {
    if (conditions.length === 0) {
      return sql;
    }

    const combinedConditions = conditions.join(' AND ');
    
    // 既存のWHERE句がある場合
    if (sql.toUpperCase().includes('WHERE')) {
      return sql.replace(/WHERE\s+/i, `WHERE (${combinedConditions}) AND `);
    } else {
      // WHERE句がない場合は追加
      const insertIndex = sql.search(/\s+(GROUP\s+BY|ORDER\s+BY|LIMIT|$)/i);
      if (insertIndex !== -1) {
        return sql.slice(0, insertIndex) + ` WHERE ${combinedConditions}` + sql.slice(insertIndex);
      } else {
        return sql + ` WHERE ${combinedConditions}`;
      }
    }
  }

  /**
   * ユーザーコンテキストを条件に適用
   */
  private applyUserContext(condition: string, user: UserPayload): string {
    return condition
      .replace(/auth\.user_id\(\)/g, `'${user.sub}'`)
      .replace(/auth\.role\(\)/g, `'${user.role}'`)
      .replace(/auth\.tenant_id\(\)/g, `'${user.tenant_id || 'default'}'`)
      .replace(/auth\.email\(\)/g, `'${user.email || ''}'`);
  }

  /**
   * クエリにRLSを適用
   */
  applyRLS(sql: string, user: UserPayload): string {
    const analysis = this.analyzeQuery(sql);
    
    // DDL操作は制限しない（管理者のみ実行可能）
    if (['CREATE', 'DROP'].includes(analysis.operation)) {
      if (user.role !== 'service_role') {
        throw new Error('DDL operations require service role');
      }
      return sql;
    }

    // RLS適用条件を収集
    const rlsConditions: string[] = [];
    
    for (const tableName of analysis.tables) {
      // テーブルのRLSが有効でない場合はスキップ
      if (!this.isRLSEnabled(tableName)) {
        continue;
      }

      const applicablePolicies = this.getApplicablePolicies(
        tableName,
        analysis.operation,
        user.role
      );

      if (applicablePolicies.length === 0) {
        // 適用可能なポリシーがない場合は拒否
        throw new Error(`Access denied to table ${tableName}: No applicable RLS policies`);
      }

      // ポリシー条件を適用
      for (const policy of applicablePolicies) {
        const condition = this.applyUserContext(policy.condition, user);
        if (condition !== 'true') {
          rlsConditions.push(condition);
        }
      }
    }

    // 条件をクエリに適用
    const modifiedSQL = this.applyConditionsToQuery(sql, rlsConditions);
    
    // ログ記録
    if (modifiedSQL !== sql) {
      log.info(`RLS applied to query for user ${user.sub}`);
      AuditLogManager.log({
        level: AuditLogLevel.INFO,
        eventType: AuditEventType.DATA_READ,
        userId: user.sub,
        tenantId: user.tenant_id,
        result: 'SUCCESS',
        message: 'RLS policies applied to query',
        details: { 
          originalSQL: sql, 
          modifiedSQL: modifiedSQL,
          appliedConditions: rlsConditions,
        },
      });
    }

    return modifiedSQL;
  }

  /**
   * ポリシー一覧を取得
   */
  listPolicies(): RLSPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * テーブル固有のポリシーを取得
   */
  getTablePolicies(tableName: string): RLSPolicy[] {
    return Array.from(this.policies.values()).filter(
      policy => policy.tableName === tableName || policy.tableName === '*'
    );
  }

  /**
   * ポリシーを取得
   */
  getPolicy(id: string): RLSPolicy | undefined {
    return this.policies.get(id);
  }

  /**
   * RLS統計情報を取得
   */
  getStatistics(): {
    totalPolicies: number;
    activePolicies: number;
    enabledTables: number;
    policiesByType: Record<string, number>;
  } {
    const policies = Array.from(this.policies.values());
    const policiesByType: Record<string, number> = {};

    for (const policy of policies) {
      const type = policy.policyType;
      policiesByType[type] = (policiesByType[type] || 0) + 1;
    }

    return {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.isActive).length,
      enabledTables: this.tableRLSEnabled.size,
      policiesByType,
    };
  }
}

/**
 * Express.js ミドルウェア: RLS適用
 */
export function rlsMiddleware() {
  const rlsManager = RLSManager.getInstance();

  return (req: any, res: any, next: any) => {
    const originalSend = res.send;
    
    // レスポンスを interceptして RLS を適用
    res.send = function(body: any) {
      if (req.user && req.body && req.body.sql) {
        try {
          const modifiedSQL = rlsManager.applyRLS(req.body.sql, req.user);
          req.body.sql = modifiedSQL;
        } catch (error) {
          log.error(`RLS application failed: ${error}`);
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied by RLS policy',
          });
        }
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
}

/**
 * RLSヘルパー関数
 */
export const rls = {
  /**
   * マネージャーインスタンスを取得
   */
  manager: () => RLSManager.getInstance(),

  /**
   * ポリシーを作成
   */
  createPolicy: (policy: Omit<RLSPolicy, 'createdAt' | 'updatedAt'>) => {
    const manager = RLSManager.getInstance();
    manager.createPolicy(policy);
  },

  /**
   * テーブルのRLSを有効化
   */
  enableTableRLS: (tableName: string) => {
    const manager = RLSManager.getInstance();
    manager.enableRLS(tableName);
  },

  /**
   * テーブルのRLSを無効化
   */
  disableTableRLS: (tableName: string) => {
    const manager = RLSManager.getInstance();
    manager.disableRLS(tableName);
  },

  /**
   * クエリにRLSを適用
   */
  applyToQuery: (sql: string, user: UserPayload) => {
    const manager = RLSManager.getInstance();
    return manager.applyRLS(sql, user);
  },

  /**
   * ポリシー一覧を取得
   */
  listPolicies: () => {
    const manager = RLSManager.getInstance();
    return manager.listPolicies();
  },

  /**
   * 統計情報を取得
   */
  getStatistics: () => {
    const manager = RLSManager.getInstance();
    return manager.getStatistics();
  },
}; 