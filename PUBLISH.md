# GFTD ORM - GitHub Package Registry Publication Guide

## 📋 事前準備

### 1. GitHub CLIでの認証とトークン作成

#### GitHub CLIでログイン
```bash
# GitHub CLIでログイン（推奨方法）
gh auth login

# 認証状態の確認
gh auth status

# 現在のトークンの確認
gh auth token
```

#### Personal Access Token (Classic)の作成
**重要**: GitHub Packages (npm registry)は現在、Personal Access Token (classic)のみをサポートしています。Fine-grained tokensはまだ対応していません。

**ブラウザでの作成方法:**
1. GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. 必要なスコープを選択:
   - `write:packages` (パッケージの公開)
   - `read:packages` (パッケージの読み取り)
   - `repo` (リポジトリアクセス)
4. トークンを生成してコピー

### 2. 環境変数の設定
```bash
# トークンを環境変数に設定（安全な方法）
export GITHUB_TOKEN=ghp_your_token_here

# または.envファイルに保存
echo "GITHUB_TOKEN=ghp_your_token_here" >> .env
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

### 2. GitHub Package Registryへの認証

#### 方法1: npm loginを使用
```bash
# GitHub Package Registryにログイン
npm login --scope=@gftdcojp --registry=https://npm.pkg.github.com

# プロンプトに従って入力:
# Username: あなたのGitHubユーザー名
# Password: Personal Access Token (classic)
# Email: あなたのGitHubメールアドレス
```

#### 方法2: .npmrcファイルを使用
```bash
# プロジェクトの.npmrcファイルを作成/編集
echo "@gftdcojp:registry=https://npm.pkg.github.com/" > .npmrc
echo "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}" >> .npmrc

# または手動で.npmrcファイルに以下を追加:
# @gftdcojp:registry=https://npm.pkg.github.com/
# //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 3. バージョン更新
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

### 4. 公開
```bash
# GitHub Package Registryに公開
npm publish

# 初回公開の場合、パッケージは自動的にprivateになります
# publicにするには、GitHubのPackagesページで設定を変更してください
```

## 🤖 GitHub Actionsによる自動公開

### 1. GitHub Package Registryの設定
GitHub Package Registryを使用する場合、追加の設定は不要です。
GitHub Actionsは自動的に`GITHUB_TOKEN`を使用してパッケージを公開します。

ただし、リポジトリの`Settings` → `Actions` → `General` → `Workflow permissions`で
`Read and write permissions`が有効になっていることを確認してください。

### 2. 自動公開ワークフロー
プロジェクトには既に以下のワークフローが設定されています：

- **自動公開**: `.github/workflows/publish.yml` - リリースタグ作成時に自動公開
- **手動公開**: `.github/workflows/manual-publish.yml` - 手動でトリガー可能

## 🔧 トラブルシューティング

### 1. 認証エラー
```bash
# 現在の認証状態を確認
gh auth status

# 必要に応じて再ログイン
gh auth logout
gh auth login
```

### 2. パッケージが見つからない場合
```bash
# パッケージ名が正しいか確認
cat package.json | grep "name"

# レジストリ設定を確認
npm config get registry
npm config get @gftdcojp:registry
```

### 3. 権限エラー
- Personal Access Token (classic)に`write:packages`スコープが含まれているか確認
- 組織のPackageアクセス設定を確認

## 📦 インストール方法

### ユーザー向けインストール手順

#### 1. .npmrcファイルの設定（初回のみ）
```bash
# プロジェクトまたはグローバルの.npmrcファイルに追加
echo "@gftdcojp:registry=https://npm.pkg.github.com/" >> .npmrc

# Personal Access Tokenが必要な場合（プライベートパッケージ）
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc
```

#### 2. パッケージのインストール
```bash
# npm
npm install @gftdcojp/gftd-orm

# pnpm
pnpm add @gftdcojp/gftd-orm

# yarn
yarn add @gftdcojp/gftd-orm
```

#### 3. 使用例
```typescript
import { createClient } from '@gftdcojp/gftd-orm';

// クライアントの作成
const client = createClient({
  url: 'http://localhost:8088',
  // その他の設定...
});

// 使用例
const data = await client
  .from('users')
  .select('*')
  .where({ active: true })
  .limit(10);
```

## ✅ 公開後のチェックリスト

- [ ] [GitHub Packages](https://github.com/gftdcojp/gftd-orm/packages)でパッケージが表示される
- [ ] パッケージがpublicに設定されている（必要に応じて）
- [ ] インストールが正常に動作する
- [ ] 型定義が正しく提供される
- [ ] READMEが正しく表示される
- [ ] バージョンタグがGitリポジトリに作成されている

## 🔍 便利なコマンド

```bash
# 現在の認証状態を確認
gh auth status

# パッケージの詳細を確認
npm view @gftdcojp/gftd-orm

# パッケージのバージョン履歴を確認
npm view @gftdcojp/gftd-orm versions --json

# GitHub CLIでリリースを作成
gh release create v1.0.0 --title "Release v1.0.0" --notes "Initial release"

# リポジトリの設定を確認
gh repo view gftdcojp/gftd-orm --json

# パッケージの依存関係を確認
npm list

# アウトデートなパッケージを確認
npm outdated
```

## 📚 関連リンク

- [GitHub Packages npm registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [GitHub CLI authentication](https://docs.github.com/en/github-cli/github-cli/about-github-cli#authentication)
- [Personal Access Token management](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [npm Package configuration](https://docs.npmjs.com/cli/v8/configuring-npm/package-json) 