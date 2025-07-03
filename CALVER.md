# CalVer (Calendar Versioning)

このプロジェクトは、CalVer（Calendar Versioning）を使用してバージョン管理を行っています。

## バージョン形式

`YY.MM.MICRO`

- **YY**: 年の下2桁（例：2025年の場合は25）
- **MM**: 月（01-12）
- **MICRO**: その月の中でのリリース回数（0から開始）

### 例
- `25.07.0`: 2025年7月の最初のリリース
- `25.07.1`: 2025年7月の2回目のリリース
- `25.08.0`: 2025年8月の最初のリリース

## 使用方法

### 現在のバージョンを確認
```bash
pnpm run version
```

### バージョンを更新

#### パッチリリース（バグ修正）
```bash
pnpm run version:patch
```

#### マイナーリリース（新機能追加）
```bash
pnpm run version:minor
```

#### メジャーリリース（破壊的変更）
```bash
pnpm run version:major
```

### 次のバージョンを確認（更新しない）
```bash
pnpm run version:next
```

## スクリプトの詳細

### 利用可能なコマンド
- `pnpm run calver`: デフォルト（patch）でバージョン更新
- `pnpm run calver:init`: 初期化（現在のバージョンからCalVerへ移行）
- `pnpm run version`: 現在のバージョンを表示
- `pnpm run version:patch`: パッチバージョンを更新
- `pnpm run version:minor`: マイナーバージョンを更新
- `pnpm run version:major`: メジャーバージョンを更新
- `pnpm run version:next`: 次のバージョンを表示

### 直接実行
```bash
node scripts/update-version.js [patch|minor|major|show|next]
```

## リリースタイプ

### patch
- バグ修正
- 小さな改善
- ドキュメントの更新

### minor
- 新機能の追加
- 既存機能の拡張
- 後方互換性のある変更

### major
- 破壊的変更
- APIの大幅な変更
- アーキテクチャの変更

## 自動化

### GitHub Actions連携例
```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Update version
        run: pnpm run version:patch
      - name: Commit version bump
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add package.json
          git commit -m "chore: バージョン更新"
```

## 設定ファイル

### .calver-lock.json
このファイルは、月ごとのリリース回数を管理するために使用されます。
- Gitで管理されません（.gitignoreに追加済み）
- 自動的に生成・更新されます
- 手動で編集する必要はありません

## 利点

1. **時間的な透明性**: バージョンから即座にリリース時期がわかる
2. **自動化に適している**: 日付ベースで自動的に決まる
3. **シンプル**: 複雑な判断が不要
4. **継続的デプロイに最適**: 頻繁なリリースに対応

## 注意事項

- 月をまたぐ場合、MICROは0にリセットされます
- 同じ月内でのリリースは、MICROが自動的にインクリメントされます
- メジャーリリースの場合、MICROは10以上の値から開始されます 