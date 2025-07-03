# 開発者ガイド

## 🚀 開発環境セットアップ

### 必要な環境
- Node.js 18.x以上 (推奨: 20.x)
- pnpm 8.x以上
- Git

### 初期セットアップ
```bash
# リポジトリをクローン
git clone https://github.com/gftdcojp/gftd-orm.git
cd gftd-orm

# 依存関係をインストール
pnpm install

# ビルド
pnpm run build

# テスト実行
pnpm run test
```

## 🧪 テスト

### Vitest を使用したテスト
このプロジェクトはVitest を使用してテストを実行します。

```bash
# 全てのテストを実行
pnpm run test

# ウォッチモードでテスト実行
pnpm run test:watch

# カバレッジ付きでテスト実行
pnpm run test:coverage

# テストUIを起動
pnpm run test:ui

# ベンチマークテスト実行
pnpm run test:benchmark
```

### テストファイルの構成
```
src/
├── __tests__/
│   ├── schema.test.ts         # スキーマ定義のテスト
│   ├── query-builder.test.ts  # クエリビルダーのテスト
│   └── benchmark.test.ts      # パフォーマンステスト
└── ...
```

### テストの書き方
```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { defineSchema } from '../schema';
import { FieldType } from '../field-types';

describe('Schema Tests', () => {
  beforeEach(() => {
    // テスト前の準備
  });

  test('should create schema', () => {
    const schema = defineSchema('Test', {
      id: FieldType.UUID.primaryKey(),
      name: FieldType.STRING.notNull(),
    });
    
    expect(schema.name).toBe('Test');
  });
});
```

## 🔧 CI/CD パイプライン

### GitHub Actions ワークフロー

#### 1. メインCI/CDパイプライン (`.github/workflows/ci.yml`)
- **トリガー**: `main`, `develop` ブランチへのプッシュ/PR
- **Node.js バージョン**: 18.x, 20.x でのマトリックステスト
- **実行内容**:
  - 依存関係のインストール
  - リンター実行
  - テスト実行
  - カバレッジ収集
  - ビルド
  - アーティファクト作成
  - セキュリティスキャン
  - GitHub Packages への自動発行 (mainブランチのみ)

#### 2. セキュリティスキャン (`.github/workflows/security.yml`)
- **トリガー**: 毎日午前2時, mainブランチへのプッシュ/PR
- **実行内容**:
  - 依存関係の脆弱性スキャン
  - CodeQL 分析
  - シークレットスキャン

#### 3. パフォーマンステスト (`.github/workflows/performance.yml`)
- **トリガー**: 毎週月曜日午前4時, mainブランチへのプッシュ/PR
- **実行内容**:
  - ベンチマークテスト
  - ロードテスト
  - メモリリークテスト

#### 4. 依存関係の自動更新 (`.github/dependabot.yml`)
- NPM依存関係の週次更新
- GitHub Actions の週次更新
- 自動的にPRを作成

### ワークフロー監視
```bash
# ローカルでCI環境を再現
pnpm run build
pnpm run lint
pnpm run test:coverage
```

## 📊 パフォーマンス監視

### ベンチマークテスト
```typescript
import { bench, describe } from 'vitest';
import { defineSchema } from '../schema';
import { FieldType } from '../field-types';

describe('Performance Tests', () => {
  bench('schema creation', () => {
    defineSchema('BenchTest', {
      id: FieldType.UUID.primaryKey(),
      name: FieldType.STRING.notNull(),
    });
  });
});
```

### メモリリークテスト
- CI/CDパイプラインで自動実行
- 5回の反復実行でメモリ使用量を監視
- 異常な増加を検出

## 🔐 セキュリティ

### 実装されているセキュリティ機能
- **SQLインジェクション対策**: クエリビルダーでの自動エスケープ
- **入力バリデーション**: 危険なパターンの検出
- **依存関係スキャン**: 脆弱性の自動検出
- **シークレットスキャン**: 機密情報の漏洩防止

### セキュリティスキャンの実行
```bash
# 依存関係の脆弱性チェック
pnpm audit

# 手動でセキュリティテスト実行
pnpm run test src/**/*.security.test.ts
```

## 🚀 デプロイメント

### 自動デプロイ
- mainブランチへのプッシュで自動的にGitHub Packagesに発行
- タグ付きリリースで本番環境にデプロイ

### 手動デプロイ
```bash
# ビルド
pnpm run build

# テスト実行
pnpm run test

# 発行
pnpm publish
```

## 📈 監視とアラート

### 実装されている監視機能
- **パフォーマンス監視**: ベンチマークテストの自動実行
- **セキュリティアラート**: 脆弱性検出時の自動通知
- **依存関係監視**: 古い依存関係の自動検出
- **メモリリーク検出**: 定期的なメモリ使用量チェック

### アラート設定
- パフォーマンスが200%以上劣化した場合
- 新しい脆弱性が検出された場合
- ビルドやテストが失敗した場合

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. テスト実行時の型エラー
```bash
# Vitestの依存関係をインストール
pnpm install vitest @vitest/ui @vitest/coverage-v8 --save-dev
```

#### 2. ビルドエラー
```bash
# 依存関係を再インストール
pnpm clean
pnpm install
pnpm run build
```

#### 3. CI/CDパイプラインの失敗
- GitHub Actionsのログを確認
- ローカルで同じコマンドを実行してテスト
- 必要に応じて依存関係を更新

### ログの確認
```bash
# 詳細なテストログ
pnpm run test --reporter=verbose

# ビルドログ
pnpm run build --verbose
```

## 🤝 コントリビューション

### 開発フロー
1. Issueを作成
2. featureブランチを作成
3. 変更を実装
4. テストを追加/更新
5. Pull Request作成
6. レビューとマージ

### コードスタイル
- TypeScript strict mode使用
- ESLint + Prettier によるコードフォーマット
- コミットメッセージは日本語で記載

### Pull Request チェックリスト
- [ ] テストが追加されている
- [ ] 既存のテストが通る
- [ ] リンターエラーがない
- [ ] ドキュメントが更新されている
- [ ] セキュリティ要件を満たしている

## 📚 参考資料

- [Vitest Documentation](https://vitest.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm Documentation](https://pnpm.io/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [ksqlDB Documentation](https://docs.ksqldb.io/) 