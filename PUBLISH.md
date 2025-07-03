# GFTD ORM - NPM Package Publication Guide

## 📋 事前準備

### 1. NPMアカウントの準備
```bash
# NPMアカウントを作成（まだない場合）
npm adduser

# または既存アカウントでログイン
npm login
```

### 2. パッケージ名の確認
```bash
# パッケージ名が利用可能かチェック
npm view gftd-orm

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
# パッケージを公開
npm publish

# 初回公開時にスコープ付きパッケージを公開する場合
npm publish --access public
```

## 🤖 GitHub Actionsによる自動公開

### 1. NPMトークンの設定
1. [npmjs.com](https://www.npmjs.com/) にログイン
2. Access Tokens → Generate New Token → Automation を選択
3. トークンをコピー
4. GitHubリポジトリの Settings → Secrets and variables → Actions
5. `NPM_TOKEN` として追加

### 2. 自動公開の方法

#### 方法1: 手動トリガー
1. GitHubリポジトリの Actions タブを開く
2. "Manual Publish to NPM" ワークフローを選択
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
# NPMから
npm install gftd-orm

# pnpmから
pnpm add gftd-orm

# yarnから
yarn add gftd-orm
```

### 使用例
```typescript
import { createClient } from 'gftd-orm';

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
   - NPMトークンが無効または権限不足
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
npm publish --dry-run

# ローカルでパッケージをテスト
npm pack
npm install ./gftd-orm-0.1.0.tgz
```

## 📝 チェックリスト

### 公開前のチェックリスト
- [ ] `package.json`の内容が正しい
- [ ] `README.md`が最新
- [ ] テストがすべて通る
- [ ] ビルドが成功する
- [ ] 不要なファイルが`.npmignore`に含まれている
- [ ] バージョンが適切に設定されている
- [ ] NPMトークンが設定されている

### 公開後のチェックリスト
- [ ] [npmjs.com](https://www.npmjs.com/package/gftd-orm)でパッケージが表示される
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