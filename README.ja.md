<p align="center">
  <a href="https://github.com/Wondermove-Inc/saaslens"><img src="docs/screenshots/hero-banner.svg" alt="saaslens" /></a>
</p>
<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">中文</a>
</p>
<p align="center">
  <strong>オープンソースSaaS支出インテリジェンスプラットフォーム。</strong><br/>
  未使用のサブスクリプションを発見し、支払いをアプリにマッチングし、シートとコストを管理 — すべてセルフホスティングで。
</p>
<p align="center">
  <a href="https://github.com/Wondermove-Inc/saaslens/actions/workflows/ci.yml"><img src="https://github.com/Wondermove-Inc/saaslens/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/Wondermove-Inc/saaslens/stargazers"><img src="https://img.shields.io/github/stars/Wondermove-Inc/saaslens" alt="GitHub Stars" /></a>
  <a href="https://github.com/Wondermove-Inc/saaslens/graphs/contributors"><img src="https://img.shields.io/github/contributors/Wondermove-Inc/saaslens" alt="Contributors" /></a>
</p>
<p align="center"><a href="#クイックスタート">クイックスタート</a> · <a href="#主な機能">主な機能</a> · <a href="docs/guide/">ドキュメント</a> · <a href="#ロードマップ">ロードマップ</a> · <a href="CONTRIBUTING.md">コントリビュート</a></p>

---

<p align="center"><sub>saaslensが役に立ったら、ぜひ<a href="https://github.com/Wondermove-Inc/saaslens">star</a>をお願いします。より多くの人がプロジェクトを発見できます。</sub></p>

https://github.com/user-attachments/assets/47632ce2-cef5-4e8d-90a1-d4c6627099b3

## なぜsaaslensか

中小規模のチームは多数のSaaSツールを利用していますが、以下の3つの質問に同時に答えられる場所がありません：

- **どのアプリに支払いをしているのか？**
- **どのシートがまだ使われていて、どれが未使用か？**
- **法人カードの支払いは本当にそのアプリと一致しているか？**

Zylo、Productiv、Cleanspendなどの商用ツールが解決しますが、データをベンダーに預け、シート単位の料金を課します。

**saaslens**はオープンソースの代替手段です。支払いフィードをSaaSアプリと照合し、シート利用率を追跡し、未使用シートと異常支出を表面化します — すべて**セルフホスティング**で、**データはお客様のインフラに留まります**。

## 主な機能

<table>
<tr><td width="50%">

### サブスクリプション＆アプリインベントリ

組織が使用するすべてのSaaSアプリの単一の情報源。支払いフィード、SSO、ブラウザ拡張機能で自動検出。

</td><td width="50%">

### 支払い-アプリマッチング

法人カードとERP支払い明細を既知のSaaSアプリに自動マッチング。地域プリセット（韓国カード発行会社等）をサポート。

</td></tr>
<tr><td width="50%">

### シート＆利用状況トラッキング

誰が何にアクセスできるかを追跡。退職者の未使用シートを特定し、次の課金サイクル前にライセンスを回収。

</td><td width="50%">

### 部門別コスト分析

部門、チーム、コストセンター別にSaaS支出を分析。トレンドを把握し、財務レビュー用レポートを生成。

</td></tr>
<tr><td width="50%">

### ブラウザ拡張機能

SaaSログインアクティビティをキャプチャするオプションのChrome拡張機能。シャドーITを発見。

</td><td width="50%">

### AI搭載インサイト

SaaSポートフォリオを分析し最適化を推奨する内置AIエージェント：重複ツールの統合、契約再交渉、未使用シートの回収。

</td></tr>
</table>

<p align="center"><img src="docs/screenshots/subscriptions.png" alt="saaslens サブスクリプション" width="800" /><br/><sub>支払いマッチングとシートトラッキングを含むサブスクリプション管理</sub></p>
<p align="center"><img src="docs/screenshots/cost-analytics.png" alt="saaslens コスト分析" width="800" /><br/><sub>異常検知とコスト分布分析</sub></p>

## 仕組み

<p align="center"><img src="docs/screenshots/architecture.svg" alt="saaslens アーキテクチャ" width="800" /></p>

1. **支払い取込** — CSV/ERPインポートまたは銀行/カードコネクタ経由。
2. **利用状況キャプチャ** — Google Workspace SSO、Chrome拡張機能、手動入力。
3. **照合** — 支払い、シート、部門を1つの正規モデルに — 初日からマルチテナント。
4. **アクション** — ダッシュボードでアプリを未使用としてマーク、シートを回収、AIに推奨を依頼。

## 競合比較

| 機能               | saaslens |   Zylo   | Productiv | Cleanspend |
| ------------------ | :------: | :------: | :-------: | :--------: |
| オープンソース     | **Yes**  |    No    |    No     |     No     |
| セルフホスティング | **Yes**  |    No    |    No     |     No     |
| データ所有権       | **100%** | ベンダー | ベンダー  |  ベンダー  |
| 支払いマッチング   | **Yes**  |   Yes    |  限定的   |    Yes     |
| シートトラッキング | **Yes**  |   Yes    |    Yes    |     No     |
| AI推奨             | **Yes**  |   Yes    |    Yes    |     No     |
| シート単価         | **無料** |   $$$    |    $$$    |     $$     |

## テックスタック

| レイヤー       | テクノロジー                                    |
| -------------- | ----------------------------------------------- |
| フロントエンド | Next.js 15 (App Router) + React 19 + TypeScript |
| UI             | Shadcn/ui + Radix + Tailwind CSS 4              |
| データ         | Refine 5 + TanStack React Query/Table           |
| 認証           | NextAuth 5 + Prisma Adapter                     |
| ORM            | Prisma 6 / PostgreSQL                           |
| AI             | Anthropic AI SDK + Vercel AI SDK                |
| キャッシュ     | Upstash Redis                                   |

## クイックスタート

### オプションA：Docker（推奨）

```bash
git clone https://github.com/Wondermove-Inc/saaslens.git && cd saaslens
docker compose up -d
# → http://localhost:3000
```

### オプションB：ローカル（Node.js 20+、PostgreSQL 14+）

```bash
git clone https://github.com/Wondermove-Inc/saaslens.git && cd saaslens
npm install --legacy-peer-deps  # React 19 peer dep互換性。機能に影響なし。
cp .env.example .env.local      # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL設定
npx prisma migrate deploy && npx prisma generate
npm run dev                     # → http://localhost:3000
```

## ロードマップ

- [ ] **v0.1** — 初回パブリックリリース（2026年Q2）
- [ ] **v0.2** — 支払い統合プラグインシステム（2026年Q3）
- [ ] **v0.3** — セルフホスティングDocker Composeクイックスタート（2026年Q3）
- [ ] **v1.0** — 安定API、多言語対応拡張（2026年Q4）

アイデアがありますか？[Discussionを開いてください](../../discussions)。

## コミュニティ

- [GitHub Discussions](../../discussions) — 質問やアイデアの共有
- [GitHub Issues](../../issues) — バグ報告と機能リクエスト
- [CONTRIBUTING.md](CONTRIBUTING.md) — コントリビュート方法

## ライセンス

MIT © 2026 Wondermove-Inc. [LICENSE](LICENSE)参照。
