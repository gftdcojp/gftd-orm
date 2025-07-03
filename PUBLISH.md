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
**重要**: GitHub Packages (npm registry)は現在、**Personal Access Token (classic)のみをサポート**しています。Fine-grained tokensはまだ対応していません。

**ブラウザでの作成方法:**
1. GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. 必要なスコープを選択:
   - `write:packages` (パッケージの公開)
   - `read:packages` (パッケージの読み取り)
   - `repo` (リポジトリアクセス)
   - `delete:packages` (パッケージの削除、必要に応じて)
4. トークンを生成してコピー

**注意事項:**
- パッケージ名とスコープは**小文字のみ**使用可能
- npmバージョンのtarballは**256MB未満**である必要があります
- 初回公開時のパッケージの既定の可視性は**プライベート**です

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

# パッケージ内容を確認（ドライラン）
npm pack --dry-run

# 公開前のテスト（実際には公開されません）
npm publish --dry-run
```

### 2. GitHub Package Registryへの認証

#### 方法1: npm loginを使用（推奨）
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

**重要な設定確認:**
- リポジトリの`Settings` → `Actions` → `General` → `Workflow permissions`で`Read and write permissions`が有効になっていることを確認
- パッケージを発行するワークフローを含むリポジトリには、自動的にリポジトリ内のパッケージに対する`admin`アクセス許可が付与されます

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

# npmの認証情報を確認
npm whoami --registry=https://npm.pkg.github.com
```

### 2. パッケージが見つからない場合
```bash
# パッケージ名が正しいか確認
cat package.json | grep "name"

# レジストリ設定を確認
npm config get registry
npm config get @gftdcojp:registry

# GitHub Package Registryでの認証確認
npm whoami --registry=https://npm.pkg.github.com
```

### 3. 権限エラー
- Personal Access Token (classic)に`write:packages`スコープが含まれているか確認
- 組織のPackageアクセス設定を確認
- パッケージ名とスコープが小文字のみで構成されているか確認

### 4. よくあるエラーと対処法
```bash
# 403 Forbidden エラー
# → Personal Access Tokenの権限を確認
# → 組織の設定でPackagesが有効になっているか確認

# 422 Unprocessable Entity
# → 同じバージョンが既に存在する
# → バージョンを更新して再実行

# ENOTFOUND エラー
# → ネットワーク接続とレジストリURLを確認
```

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

#### 3. 複数のOrganizationからのパッケージを使用する場合
```bash
# .npmrcファイルに複数のレジストリを設定
echo "@gftdcojp:registry=https://npm.pkg.github.com/" >> .npmrc
echo "@other-org:registry=https://npm.pkg.github.com/" >> .npmrc
```

#### 4. 使用例
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
- [ ] パッケージのメタデータ（説明、キーワード、ライセンス）が正しく設定されている

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

# パッケージのダウンロード統計（GitHub Packagesでは制限あり）
npm view @gftdcojp/gftd-orm --json

# ローカルでのパッケージテスト
npm pack
npm install ./gftdcojp-gftd-orm-0.1.0.tgz
```

## 📊 パッケージの可視性と制限事項

### 制限事項
- **パッケージ名とスコープ**: 小文字のみ使用可能
- **ファイルサイズ**: npmバージョンのtarballは256MB未満
- **認証**: Personal Access Token (classic)のみサポート
- **初期可視性**: 新しいパッケージは既定でプライベート

### 可視性の変更
1. GitHubのリポジトリページで`Packages`タブを開く
2. 対象のパッケージを選択
3. `Package settings`で可視性を変更
4. パブリックにする場合は`Change visibility`から設定

## 📚 関連リンク

- [npmレジストリの利用 - GitHub Docs](https://docs.github.com/ja/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [GitHub CLI authentication](https://docs.github.com/en/github-cli/github-cli/about-github-cli#authentication)
- [Personal Access Token management](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [npm Package configuration](https://docs.npmjs.com/cli/v8/configuring-npm/package-json)
- [GitHub Packagesの権限について](https://docs.github.com/ja/packages/learn-github-packages/about-permissions-for-github-packages) 