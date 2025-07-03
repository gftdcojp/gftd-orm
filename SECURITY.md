# セキュリティガイド

## 🛡️ セキュリティ機能概要

GFTD ORMは、エンタープライズグレードのセキュリティ機能を提供します。

### 実装済みセキュリティ対策

#### ✅ 認証・認可
- **JWT署名検証**: 強化されたJWTトークン検証
- **パスワードハッシュ化**: bcryptによる安全なパスワード保管
- **セッション管理**: セキュアなセッション管理とタイムアウト
- **多要素認証**: OAuth (Google, GitHub) 対応

#### ✅ インジェクション攻撃対策
- **SQLインジェクション対策**: パラメータ化クエリとエスケープ処理
- **XSS対策**: HTMLエスケープと入力値サニタイゼーション
- **コマンドインジェクション対策**: 入力値検証と制限

#### ✅ レート制限・DDoS対策
- **グローバルレート制限**: IP別アクセス制限
- **ユーザー別レート制限**: 認証ユーザーの個別制限
- **エンドポイント別制限**: API毎の細かい制限
- **段階的遅延**: スロー制限による段階的な応答遅延
- **自動IPブロック**: 疑わしいアクティビティの自動検出・ブロック

#### ✅ 監査・ログ
- **包括的監査ログ**: 全アクティビティの記録
- **セキュリティイベント監視**: 異常検知とアラート
- **ログローテーション**: 自動ログファイル管理
- **統計情報**: セキュリティ状況の可視化

#### ✅ データ保護
- **機密情報の環境変数化**: ハードコードの排除
- **セキュアな乱数生成**: 暗号学的に安全な乱数
- **時間ベーストークン**: TOTP対応
- **CSRF保護**: クロスサイトリクエストフォージェリ対策

## 🔧 設定方法

### 環境変数設定

`.env`ファイルまたは環境変数として以下を設定：

```bash
# 必須設定
GFTD_JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
GFTD_KSQLDB_ENDPOINT=https://your-ksqldb-endpoint
GFTD_SCHEMA_REGISTRY_URL=https://your-schema-registry-url

# オプション設定
GFTD_BCRYPT_ROUNDS=12
GFTD_RATE_LIMIT_WINDOW_MS=900000
GFTD_RATE_LIMIT_MAX_REQUESTS=100
GFTD_AUDIT_LOG_ENABLED=true
```

### セキュリティ機能の有効化

```typescript
import { 
  createClient, 
  SecurityMiddlewareManager,
  AuditLogManager,
  RateLimitManager 
} from '@gftdcojp/gftd-orm';

// クライアント作成
const client = createClient({
  // ... 基本設定
});

// セキュリティミドルウェア（Express.js使用時）
app.use(SecurityMiddlewareManager.createSecurityMiddleware({
  rateLimit: {
    global: true,
    perUser: true,
    perEndpoint: true,
    slowDown: true,
  },
  auditLog: true,
  ipBlocking: true,
  csrfProtection: true,
}));
```

## 🔍 セキュリティモニタリング

### 監査ログの確認

```typescript
// セキュリティイベントの検索
const securityEvents = await AuditLogManager.searchLogs({
  eventType: AuditEventType.SECURITY_VIOLATION,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 過去24時間
  limit: 100,
});

// 統計情報の取得
const stats = await AuditLogManager.getStatistics();
console.log('セキュリティ違反数:', stats.securityViolations);
```

### レート制限状況の確認

```typescript
// レート制限の統計
const rateLimitStats = RateLimitManager.getInstance().getStatistics();
console.log('アクティブな制限:', rateLimitStats.activeKeys);

// ブロック中IPの確認
const blockedIPs = IPBlockManager.getBlockedIPs();
console.log('ブロック中IP:', blockedIPs);
```

### セキュリティヘルスチェック

```typescript
// 全体的なセキュリティ状況
const securityStatus = SecurityMiddlewareManager.getSecurityStatus();
console.log('セキュリティ状況:', securityStatus);
```

## 🚨 インシデント対応

### セキュリティ違反への対応

1. **即座の対応**
   ```typescript
   // 疑わしいIPをブロック
   IPBlockManager.blockIP('192.168.1.100');
   
   // ユーザーセッションを無効化
   SessionManager.deleteUserSessions('user-id');
   
   // レート制限をリセット
   RateLimitManager.getInstance().resetLimit('key');
   ```

2. **ログ分析**
   ```typescript
   // 特定ユーザーのアクティビティ確認
   const userActivity = await AuditLogManager.searchLogs({
     userId: 'suspicious-user-id',
     startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   });
   ```

3. **システム強化**
   - セキュリティ設定の見直し
   - レート制限の調整
   - 監視アラートの追加

## 📋 セキュリティチェックリスト

### 導入時
- [ ] JWT秘密キーが32文字以上
- [ ] 機密情報が環境変数化されている
- [ ] HTTPS通信が設定されている
- [ ] CORS設定が適切
- [ ] 監査ログが有効

### 運用時
- [ ] 定期的なセキュリティログの確認
- [ ] 異常なアクセスパターンの監視
- [ ] セキュリティアップデートの適用
- [ ] バックアップの定期実行
- [ ] インシデント対応手順の確認

## 🔄 定期メンテナンス

### 日次
- セキュリティログの確認
- ブロックIPリストの見直し
- 異常なアクセスパターンのチェック

### 週次
- セキュリティ統計の分析
- レート制限設定の調整
- パフォーマンス影響の確認

### 月次
- セキュリティ設定の全体見直し
- 脆弱性スキャンの実行
- インシデント対応手順の更新

## 📚 関連リソース

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

## 🆘 サポート

セキュリティに関する問題や質問がある場合：

1. **緊急時**: security@gftd.co.jp
2. **一般的な問い合わせ**: [GitHub Issues](https://github.com/gftdcojp/gftd-orm/issues)
3. **脆弱性報告**: 責任ある開示ポリシーに従って報告してください

---

**注意**: このドキュメントは参考情報です。本番環境では、組織のセキュリティポリシーに従って適切な設定を行ってください。 