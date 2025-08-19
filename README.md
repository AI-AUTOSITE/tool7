# BlurTap - AI-Powered Privacy Protection Tool

## 📋 セットアップ手順

### 1. リポジトリの準備

```bash
# GitHubで新しいリポジトリ「tool7」を作成してから
git clone https://github.com/[あなたのユーザー名]/tool7.git
cd tool7
```

### 2. プロジェクトファイルの配置

以下の構造でファイルを配置してください：

```
tool7/
├── src/
│   └── app/
│       ├── api/
│       │   └── detect/
│       │       └── route.ts
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── .env.local.example
├── .gitignore
└── README.md
```

### 3. .gitignoreファイルの作成

```bash
# .gitignore
node_modules/
.next/
out/
.env.local
.env*.local
.DS_Store
*.log
.vercel
```

### 4. 依存関係のインストール

```bash
npm install
```

### 5. 環境変数の設定

`.env.local.example`を`.env.local`にコピーして、APIキーを設定：

```bash
cp .env.local.example .env.local
```

`.env.local`を編集してAPIキーを追加：
```
GOOGLE_API_KEY=あなたのGoogle Vision APIキー
OPENAI_API_KEY=あなたのOpenAI APIキー
```

### 6. ローカルでテスト

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いて確認

### 7. GitHubにプッシュ

```bash
git add .
git commit -m "Initial commit - BlurTap tool"
git push origin main
```

### 8. Vercelにデプロイ

1. [Vercel](https://vercel.com)にログイン
2. 「New Project」をクリック
3. GitHubリポジトリ「tool7」をインポート
4. 環境変数を設定：
   - `GOOGLE_API_KEY`
   - `OPENAI_API_KEY`
5. 「Deploy」をクリック

### 9. カスタムドメインの設定（Vercel）

1. Vercelのプロジェクト設定 > Domains
2. `tool7.ai-autosite.com`を追加
3. DNS設定（レンタルサーバー側）：
   - CNAMEレコード: `tool7` → `cname.vercel-dns.com`

## 🔧 APIキーの取得方法

### Google Vision API
1. [Google Cloud Console](https://console.cloud.google.com)にアクセス
2. 新しいプロジェクトを作成
3. Vision APIを有効化
4. 認証情報 > APIキーを作成

### OpenAI API
1. [OpenAI Platform](https://platform.openai.com)にアクセス
2. API Keys > Create new secret key

## 📝 エラーが出た場合

### TypeScriptエラー
`next.config.js`で既に`ignoreBuildErrors: true`を設定済みなので、一時的にエラーを無視してデプロイ可能です。

### ビルドエラー
```bash
npm run build
```
でエラーを確認して修正

### Vercelデプロイエラー
Vercelのダッシュボードでビルドログを確認

## 🚀 今後の改善案

- [ ] データベース連携（使用回数制限の永続化）
- [ ] 顔認識の精度向上
- [ ] バッチ処理対応
- [ ] PDFサポート
- [ ] 多言語対応

## 📧 サポート

問題が発生した場合は、GitHubのIssuesで報告してください。