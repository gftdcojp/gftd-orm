# GFTD ORM - GitHub Package Registry Publication Guide

## 📋 事前準備

### 1. GitHub Package Registryの準備
```bash
# GitHub Personal Access Tokenを作成
# Settings → Developer settings → Personal access tokens → Generate new token
# 必要な権限: read:packages, write:packages, delete:packages

# GitHub Package Registryにログイン
npm login --scope=@gftdcojp --registry=https://npm.pkg.github.com/
```

### 2. パッケージ名の確認
```bash
# パッケージ名が利用可能かチェック
npm view @gftdcojp/gftd-orm --registry=https://npm.pkg.github.com/

# エラーになれば利用可能
```

## 🚀 手動公開の手順

### 1. 最終確認
```bash
# 依存関係を確認
pnpm install

# テストを実行
pnpm test

# ビルドを実行
pnpm build

# パッケージ内容を確認
npm pack --dry-run
```

### 2. バージョン更新
```bash
# パッチバージョン更新（例：0.1.0 → 0.1.1）
npm version patch

# マイナーバージョン更新（例：0.1.0 → 0.2.0）
npm version minor

# メジャーバージョン更新（例：0.1.0 → 1.0.0）
npm version major

# 特定のバージョンを指定
npm version 1.0.0
```

### 3. 公開
```bash
# GitHub Package Registryに公開
npm publish --registry=https://npm.pkg.github.com/

# または直接
pnpm publish
```

## 🤖 GitHub Actionsによる自動公開

### 1. GitHub Package Registryの設定
GitHub Package Registryを使用する場合、追加の設定は不要です。
GitHub Actionsは自動的に`GITHUB_TOKEN`を使用してパッケージを公開します。

ただし、リポジトリの`Settings` → `Actions` → `General` → `Workflow permissions`で
`Read and write permissions`が有効になっていることを確認してください。

### 2. 自動公開の方法

#### 方法1: 手動トリガー
1. GitHubリポジトリの Actions タブを開く
2. "Manual Publish to GitHub Package Registry" ワークフローを選択
3. "Run workflow" をクリック
4. バージョンタイプを選択（patch/minor/major または具体的なバージョン番号）
5. "Run workflow" で実行

#### 方法2: リリースタグでの自動公開
```bash
# リリースタグを作成
git tag v1.0.0
git push origin v1.0.0

# またはGitHubでリリースを作成
```

## 📦 パッケージ使用方法

### インストール
```bash
# GitHub Package Registryから
npm install @gftdcojp/gftd-orm

# pnpmから
pnpm add @gftdcojp/gftd-orm

# yarnから
yarn add @gftdcojp/gftd-orm
```

### .npmrc設定（必要に応じて）
```
@gftdcojp:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 使用例
```typescript
import { createClient } from '@gftdcojp/gftd-orm';

const client = createClient({
  url: 'http://localhost:8088',
  database: {
    ksql: {
      url: 'http://localhost:8088',
      apiKey: 'your-api-key',
    },
    schemaRegistry: {
      url: 'http://localhost:8081',
      auth: { user: 'admin', pass: 'admin' },
    },
  },
});

await client.initialize();
```

## 🔧 トラブルシューティング

### よくある問題

1. **403 Forbidden エラー**
   - GitHub Personal Access Tokenが無効または権限不足
   - パッケージ名が既に使用されている

2. **422 Unprocessable Entity**
   - 同じバージョンが既に公開されている
   - バージョンを更新して再実行

3. **ビルドエラー**
   - TypeScriptエラーを修正
   - 依存関係を確認

### デバッグ方法
```bash
# パッケージの詳細な情報を確認
npm pack --dry-run

# 公開前のテスト
npm publish --dry-run --registry=https://npm.pkg.github.com/

# ローカルでパッケージをテスト
npm pack
npm install ./gftdcojp-gftd-orm-0.1.0.tgz
```

## 📝 チェックリスト

### 公開前のチェックリスト
- [ ] `package.json`の内容が正しい
- [ ] `README.md`が最新
- [ ] テストがすべて通る
- [ ] ビルドが成功する
- [ ] 不要なファイルが`.npmignore`に含まれている
- [ ] バージョンが適切に設定されている
- [ ] GitHub Personal Access Tokenが設定されている

### 公開後のチェックリスト
- [ ] [GitHub Packages](https://github.com/gftdcojp/gftd-orm/packages)でパッケージが表示される
- [ ] インストールが正常に動作する
- [ ] 型定義が正しく提供される
- [ ] ドキュメントが正しく表示される

## 🎯 次のステップ

1. **CI/CDの改善**
   - テストカバレッジの確認
   - セキュリティチェックの追加
   - 自動バージョン管理

2. **モニタリング**
   - ダウンロード数の監視
   - フィードバックの収集
   - バグレポートの対応

3. **機能拡張**
   - 新機能の追加
   - パフォーマンスの改善
   - ドキュメントの充実

## 📋 現在の設定サマリー

✅ **完了済み設定:**
- パッケージ名: `@gftdcojp/gftd-orm`
- GitHub Package Registry設定
- 自動公開ワークフロー
- 手動公開ワークフロー  
- TypeScriptビルド設定
- テスト実行環境
- .npmignore設定

🔄 **次に必要なアクション:**
1. GitHubリポジトリを`gftdcojp/gftd-orm`に作成
2. Workflow permissions設定
3. Personal Access Token設定（手動公開用）
4. 初回公開実行 