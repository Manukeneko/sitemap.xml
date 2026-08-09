# AI収益工場 全体設計書

version: 0.6 (Phase 1・2・3・4・5・6・7・8 実装時点 + ユニットテスト整備。Phase9は意図的に未実装)
最終更新: 2026-08-08

> 本ドキュメントはリポジトリ `manukeneko/sitemap.xml` 内の新規サブプロジェクト `revenue-factory/` の設計書です。既存の `検定ラボ`（静的サイト量産テンプレート、リポジトリ直下）とは別プロダクトとして、`revenue-factory/` 配下に独立した動的アプリケーションとして構築しています。将来的にはこの収益工場から「検定ラボ」のような静的サイトを1つの収益商品として量産管理することも可能な設計にしています。

---

## 1. 全体設計

### 1.1 目的

複数のAI・API・自動化技術を組み合わせ、以下のループを可能な限り自動化する。

```
市場調査 → 収益性判断 → コンテンツ企画 → コンテンツ制作
  → 各媒体向け変換 → 品質チェック → 投稿予約/投稿
  → アクセス・収益分析 → 自己改善 → 次の企画へ
```

「大量生産」ではなく「1つのリサーチから、各媒体に最適化された複数のオリジナルコンテンツを効率よく展開し、収益期待値の高いものから作る」ことを目標とする。

### 1.2 設計方針

- **段階的リリース**: Phase 1〜9 で機能を積み上げる（後述 §16）。いきなり全自動化しない。
- **無料/低コスト優先**: 個人〜小規模チームでの運用を想定し、無料枠・低コストAPIを優先採用。有料化は収益が出てから。
- **モジュール化**: 新しいAI・SNS・収益源を追加できるよう、コネクタ（Source/Publisher）インターフェースで抽象化。
- **人間承認を挟む**: SAFE MODE → SEMI AUTO → FULL AUTO の3段階（§13）。
- **コスト可視化**: すべてのAI呼び出しをコスト記録し、収益と比較して継続/停止を判断できるようにする（§14）。

### 1.3 全体アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                      Discord (操作パネル / Phase 8)                │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ slash commands / webhook
┌────────────────────────────────▼───────────────────────────────────┐
│                  Webダッシュボード (Next.js / Vercel)                  │
│  今日の実績・収益期待値ランキング・コンテンツ承認・AI判断ログ              │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ REST API (Next.js Route Handlers)
┌────────────────────────────────▼───────────────────────────────────┐
│                        AIエージェント層 (§10)                         │
│  AI CEO / 市場調査AI / スコアリングAI / 企画AI / 媒体別AI / 品質AI     │
│  → AI Router (§11.4) がタスクごとに最適なAI/APIを選択                │
└───────────────────────────────┬───────────────────────────────────┘
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                         ▼
┌───────────────┐     ┌──────────────────┐      ┌─────────────────────┐
│  データ収集層    │     │   コンテンツ生成層   │      │   投稿・収益連携層     │
│ (§11.2 Sources) │     │ (テキスト/画像/音声) │      │ (§13 Publishers)     │
│ Google Trends    │     │ Claude API         │      │ YouTube / X / note   │
│ YouTube Data API │     │ 画像・音声・動画API   │      │ Instagram / TikTok   │
│ Amazon/楽天 API   │     │                    │      │ Amazon/楽天アフィリ    │
└───────────────┘     └──────────────────┘      └─────────────────────┘
                                 │
┌────────────────────────────────▼───────────────────────────────────┐
│           PostgreSQL (Supabase) — topics/contents/products/revenue    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 推奨技術スタック

| レイヤ | 採用 | 理由 |
|---|---|---|
| Frontend / BFF | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Vercel無料枠でホスティング可、API RouteとUIを1リポジトリで管理でき初期コスト最小 |
| DB | PostgreSQL (Supabase) | 無料枠500MB、Auth/Storageも同一プラットフォームで拡張しやすい。当初はSQLiteも検討したが、Vercel等サーバーレス環境ではファイルシステムが永続化されず書き込みできないため、開発/本番ともPostgreSQL統一に変更 |
| ORM | Prisma | スキーマ駆動、マイグレーション管理が容易 |
| 自動化/バッチ | Next.js Route Handler + Vercel Cron（Phase1-2）→ n8n（Phase5以降、複雑な条件分岐・SNS API連携が増えたら） | 初期は依存を増やさない。複雑化したらn8nへ移行 |
| AI（推論・企画・スコアリング） | Claude API (Anthropic) | 長文構成・多段階判断・ツール利用に強く、本プロジェクトのAI CEO/企画AI/品質AIの中核 |
| AI（低コスト大量処理） | Claude Haiku 4.5 / 必要に応じ他社軽量モデル | Xの大量短文生成、ラベル分類など |
| 画像生成 | 用途に応じて選定（§3参照）。Phase3で確定 | 著作権・商用利用条件を要確認 |
| 動画生成/字幕/TTS | 用途に応じて選定（§3参照）。Phase3で確定 | 品質とコストのトレードオフが大きい領域 |
| Storage | Supabase Storage（生成物・サムネイル等） | DBと同一プラットフォームで完結 |
| 認証（ダッシュボード） | 簡易Basic認証 → Supabase Auth（Phase2以降） | Phase1は運用者1人想定のため簡易実装 |
| Discord Bot | discord.js | Phase8で導入 |
| コスト/ログ | 自前の `ai_usage_logs` テーブル + Vercel/Supabase標準ログ | 外部APM導入は収益が出てから検討 |

---

## 3. 必要なAPI（用途別）

| カテゴリ | API/サービス | 用途 | 備考 |
|---|---|---|---|
| AI推論 | Anthropic Claude API | 市場調査要約・スコアリング・企画・台本・品質チェック | 本プロジェクトの中核AI |
| AI推論（補助） | OpenAI API / Google Gemini API | AI Routerでのコスト比較・画像生成(gpt-image等)・埋め込み | Phase1では未接続、Router設計のみ用意 |
| トレンド | Google Trends（非公式） | 検索需要調査 | 公式APIなし。SerpApi等の有料代替も比較対象 |
| 動画 | YouTube Data API v3 / YouTube Analytics API | トレンド取得・投稿・実績取得 | 無料枠あり（1日1万ユニット） |
| SNS | X API v2 | 投稿・分析 | Freeプランは投稿数が非常に限定的。本格運用はBasic以上が必要（有料）。開発者申請の「データ/APIのユースケース」欄には自アカウントへの投稿のみで再配布・転売しない旨を記載する |
| SNS | Instagram Graph API (Meta) | 投稿・分析 | ビジネスアカウント必須、審査あり |
| SNS | TikTok Content Posting API | 投稿 | アプリ審査必須 |
| SNS | note | 公式APIなし | 手動運用 or 非公式手段はリスクが高いため要検討 |
| アフィリエイト | Amazon PA-API (アソシエイト) | 商品検索・リンク生成 | 一定の成約実績がないと利用継続不可 |
| アフィリエイト | 楽天ウェブサービス（楽天アフィリエイトAPI） | 商品検索・リンク生成 | 無料、要アカウント |
| アフィリエイト | 各ASP（A8.net等） | 案件検索 | API提供は限定的、多くは管理画面ベース |
| 画像生成 | 用途により選定 | サムネイル・SNS画像 | Phase3で比較検討して確定 |
| 音声(TTS) | 用途により選定 | ナレーション | Phase3で比較検討して確定 |
| 動画生成 | 用途により選定 | Shorts自動生成等 | 高コストのため導入は収益化後に再検討 |
| Storage | Supabase Storage | 生成物保存 | 無料枠1GB |
| 操作パネル | Discord Bot API | コマンド操作・通知 | 無料 |

> 画像・動画・音声生成AIは技術進化と価格変動が激しい領域のため、DESIGN.mdでは「AI Router越しに差し替え可能なインターフェース」として設計し、Phase3着手時に実際のAPIを比較検討して確定する。

---

## 4. 必要なアカウント

- Anthropic（Claude API キー）
- Vercel（ホスティング）
- Supabase（DB / Storage / Auth）
- Google Cloud（YouTube Data API / YouTube Analytics API 用OAuthクライアント）
- X Developer Portal
- Meta for Developers（Instagram Graph API、ビジネスアカウント連携）
- TikTok for Developers
- Amazonアソシエイト・プログラム
- 楽天アフィリエイト（楽天ウェブサービスAPIキー）
- 各ASP（A8.net等）
- Discord Developer Portal（Bot Token）
- （任意）OpenAI / Google AI Studio（AI Router比較用）
- （任意）画像・音声・動画生成APIの各アカウント（Phase3で選定後）

---

## 5. 各APIの料金（2026年8月時点の目安）

| API | 料金 |
|---|---|
| Claude Sonnet 5 | Input $3 / 1M tokens、Output $15 / 1M tokens（2026-08-31まで導入価格 $2 / $10） |
| Claude Opus 5 | Input $5 / 1M tokens、Output $25 / 1M tokens |
| Claude Haiku 4.5 | Input $1 / 1M tokens、Output $5 / 1M tokens |
| YouTube Data API v3 | 無料（1日1万クォータユニット、超過分は要申請） |
| X API | Free: 投稿数が月1500件程度に制限。実運用にはBasic（月額$200〜）以上が事実上必要。詳細は下記注記参照 |
| Instagram Graph API | 無料（Meta審査あり） |
| TikTok Content Posting API | 無料（審査あり） |
| Amazon PA-API | 無料（ただし一定期間の売上実績維持が必要） |
| 楽天ウェブサービスAPI | 無料 |
| Vercel | Hobby無料 / Pro $20〜（商用利用・チーム利用時） |
| Supabase | Free（500MB DB, 1GB Storage）/ Pro $25〜 |
| Discord Bot | 無料 |
| 画像/音声/動画生成 | サービス次第（従量課金が中心）。Phase3で選定時に確定し本表を更新する |

> 料金は変動するため、実装時・課金発生前に必ず公式最新情報を確認すること。特にX APIは価格改定が頻繁。
>
> **Xの収益化制度について（2026年8月時点）**: 返信スレッド広告の収益分配「Creator Revenue Sharing Program」は2026年9月7日で終了（新規登録は8月7日付で停止済み）。後継の「Original Content Rewards Program」は X Premium契約＋認証済みフォロワー500人以上＋直近90日で50万インプレッション以上が条件で、報酬はPremium会員のホームタイムライン表示（インプレッション）ベースに変わる。本プロジェクトはXを収益源そのものではなく他媒体（アフィリエイト・自社商品・note等）への集客/誘導チャネルとして位置づけているため（DESIGN.md §1, §13）設計への影響はないが、Xでのコンテンツ戦略を評価する際は「エンゲージメント最大化」より「フォロワー数・インプレッションの積み上げ」を指標にする方が今後の制度と整合する。

---

## 6. 無料で使えるもの（Phase1〜2で採用）

- Next.js / Vercel Hobby
- Supabase Free
- Prisma
- YouTube Data API（無料枠内）
- 楽天ウェブサービスAPI
- Discord Bot
- Claude API（従量課金だが小規模利用なら月数ドル〜）

## 7. 月額費用の概算

| 段階 | 内容 | 概算月額 |
|---|---|---|
| Phase1（司令塔のみ、日次リサーチ数件+スコアリング） | Claude API少量利用 + Vercel/Supabase無料枠 | 約 $5〜20 |
| Phase2〜4（企画・メディア生成追加） | Claude API利用増 + 画像/音声API従量課金 | 約 $50〜200 |
| Phase5〜7（投稿自動化・分析・自己改善が稼働） | 上記 + X API Basic等SNS有料プラン + Vercel/Supabase Pro | 約 $300〜800 |
| Phase8〜9（Discord運用・完全自動化） | 上記 + 動画生成等高コストAPIを本格投入した場合 | 事業規模に応じて変動、収益とのROIで判断（§14, §15） |

---

## 8. ディレクトリ構成（`revenue-factory/`）

```
revenue-factory/
  DESIGN.md                 このファイル
  README.md                 セットアップ手順
  package.json
  tsconfig.json
  prisma/
    schema.prisma           §9 データベース設計
    seed.ts                 開発用シードデータ
  src/
    app/
      layout.tsx
      page.tsx               ダッシュボードトップ (§17相当)
      globals.css
      api/
        research/run/route.ts     市場調査AI実行 → topics保存
        topics/route.ts           topics一覧取得
        topics/[id]/route.ts      topics詳細 + contents + products取得
        topics/[id]/plan/route.ts コンテンツ企画AI実行 → contents保存
        topics/[id]/affiliate/route.ts アフィリエイトAI実行 → products保存
        topics/[id]/archive/route.ts   テーマを停止（ROI赤字時等）
        contents/[id]/generate/route.ts       媒体別AIで台本・原稿を詳細生成（draft→review）
        contents/[id]/quality-check/route.ts  品質チェックAI実行（review/flagged→review or flagged）
        contents/[id]/approve/route.ts        人間確認完了（review[qualityStatus=passed]→approved）
        contents/[id]/schedule/route.ts       投稿予定にする（approved→scheduled）
        contents/[id]/mark-published/route.ts 投稿完了を記録（scheduled/approved→published、手動投稿フロー用）
        contents/[id]/publish/route.ts        実Publisherがあれば投稿を実行（approved/scheduled→published）
        contents/[id]/export/route.ts         コピペ投稿用テキストを取得（状態は変更しない）
        contents/[id]/media/image/route.ts    サムネイル画像生成（Phase3）
        contents/[id]/media/audio/route.ts    ナレーション音声生成（Phase3）
        contents/route.ts         ステータス別コンテンツ一覧（Discordボット等が利用）
        revenue/route.ts          収益実績の手動登録・一覧
        roi/route.ts              テーマ別ROI（AIコスト対収益）
        stats/route.ts            ダッシュボード「今日」集計
    lib/
      db.ts                  Prisma Client シングルトン
      ai/
        router.ts            AI選択ルーター（§11.4）
        providers/
          claude.ts          Anthropic SDK ラッパー
          types.ts
        costTracker.ts       ai_usage_logs 記録
      research/
        types.ts             SignalSource インターフェース
        sources/
          googleTrends.ts    SerpApi経由（任意設定）
          youtube.ts         YouTube Data API v3（任意設定）
        aggregator.ts        複数ソースの信号を集約
      scoring/
        engine.ts            収益性スコアリングエンジン（§10.3相当）
      planning/
        contentPlanner.ts    コンテンツ企画AI（§10.5相当）
      affiliate/             アフィリエイトAI（Phase4）
        types.ts             AffiliateSource インターフェース
        awsSigV4.ts          Amazon PA-API用 AWS Signature V4 自前実装（Node crypto標準のみ）
        sources/
          rakuten.ts         楽天ウェブサービスAPI（実装済み。2026年新API基盤[アクセスキー+Referer必須]対応。実クレデンシャルでのライブ疎通は環境のegress制限により未確認、実装はWebSearchで確認できた仕様に基づく最善実装）
          amazon.ts          PA-API 5.0 SearchItems（実装済み、実アカウントでの動作確認は未実施）
        selector.ts          実在商品候補からのAI選定・スコアリング
      quality/                品質チェックAI（Phase6）
        checker.ts
      publishing/              投稿ワークフロー（Phase5）
        types.ts               Publisher インターフェース
        formatForExport.ts     コピペ用テキスト整形
        oauth1.ts               X API v2用 OAuth 1.0a署名 自前実装
        publishers/manualExport.ts フォールバックPublisher（外部API非呼び出し）
        publishers/xPublisher.ts   X API v2への実投稿Publisher（x_post/x_thread）
        registry.ts             platform → Publisher 解決（xPostPublisher/xThreadPublisher優先、他はmanualExportにフォールバック）
      roi/                     ROI最適化（Phase7）
        engine.ts               テーマ別 AIコスト対収益 算出
      media/                   画像・音声生成（Phase3）
        types.ts                ImageProvider / TtsProvider インターフェース
        providers/openaiImage.ts  OpenAI Images API(gpt-image-1)
        providers/openaiTts.ts    OpenAI TTS API(tts-1)
        storage.ts               生成物をpublic/generated/へ保存（本番はStorage差し替え）
        costLogger.ts            画像/音声コストの概算記録
        generateForContent.ts    Contentからプロンプト/ナレーション文を抽出して生成
      generators/            媒体別AI（Phase2）。1ファイル追加で新媒体を拡張できる
        types.ts             ContentGeneratorSpec 共通インターフェース
        runner.ts            Claude呼び出し+コスト記録の共通処理
        youtube.ts / instagram.ts / tiktok.ts / x.ts / note.ts / blog.ts
        index.ts              platform → spec のレジストリ
    components/
      TopicTable.tsx
      StatCard.tsx
      RoiPanel.tsx
  .env.example
  discord-bot/                Phase8。別package.jsonの常駐プロセス（§15参照）
    src/{index.ts,commands.ts,api.ts,registerCommands.ts}
```

新しいSNS/AIプロバイダを追加する際は `lib/research/sources/*` または `lib/ai/providers/*` に1ファイル追加するだけで済むようにインターフェースを共通化している（拡張可能設計）。

**テスト（Vitest）**: 外部APIキーなしで実行できる純粋関数を対象にユニットテストを整備している（`npm run test`）。対象は収益性スコアリングの加重平均（`lib/scoring/engine.test.ts`）、AWS SigV4署名（`lib/affiliate/awsSigV4.test.ts`）、OAuth 1.0a署名（`lib/publishing/oauth1.test.ts`）、コピペ用テキスト整形（`lib/publishing/formatForExport.test.ts`）。署名関数は日付/nonce/timestampをテスト用に注入できるようリファクタし、決定的な出力を検証している。DB・外部APIに依存するルート/AI呼び出し自体の自動テスト（モック含む）は未整備。

---

## 9. データベース設計

Phase1で実装する最小スキーマ（Prisma、`prisma/schema.prisma` 参照）。ユーザー要求の `topics / contents / products / revenue / analytics` を基本としつつ、AIコスト管理用に `ai_usage_logs` を追加。

- **Topic**: 発見したテーマと収益性スコア
- **Content**: Topicから派生する媒体別コンテンツ（企画〜投稿まで）
- **Product**: アフィリエイト商品・自社商品候補
- **Revenue**: 収益実績（媒体・コンテンツ単位）
- **Analytics**: コンテンツごとの分析指標
- **AiUsageLog**: AI/API呼び出しのコスト記録（§14で使用）

詳細カラムは `prisma/schema.prisma` を正とする。

---

## 10. AIエージェント構成（Phase1実装範囲）

| エージェント | Phase1での実装状況 | 役割 |
|---|---|---|
| AI CEO | 未実装（Phase7以降、自己改善ループと合わせて実装） | 全体戦略・優先順位決定 |
| 市場調査AI | **実装** (`lib/research/aggregator.ts` + Claude) | 複数ソースの信号を集約し「今作る価値があるテーマ」を抽出 |
| 収益性スコアリングAI | **実装** (`lib/scoring/engine.ts`) | 検索需要・SNS需要・競合度等を統合し総合収益期待値を算出 |
| コンテンツ企画AI | **実装** (`lib/planning/contentPlanner.ts`) | Topicから媒体別企画を生成 |
| YouTube AI（長尺・Shorts） | **実装** (`lib/generators/youtube.ts`) | 台本・フック・概要欄・サムネ案・Shorts複数本を生成 |
| Instagram AI（Reels・カルーセル） | **実装** (`lib/generators/instagram.ts`) | 台本・スライド構成・キャプションを生成 |
| TikTok AI | **実装** (`lib/generators/tiktok.ts`) | 冒頭フック重視の台本を生成 |
| X AI（通常投稿・スレッド） | **実装** (`lib/generators/x.ts`) | 価値提供→自然な誘導の投稿・スレッドを生成 |
| note AI（無料・有料記事） | **実装** (`lib/generators/note.ts`) | 無料→有料への導線を意識した記事を生成 |
| SEOブログAI | **実装** (`lib/generators/blog.ts`) | 見出し・FAQ・メタディスクリプション込みの記事を生成 |
| アフィリエイトAI | **実装**（`lib/affiliate/selector.ts`） | 楽天ウェブサービスAPI + Amazon PA-API 5.0（SigV4署名は`lib/affiliate/awsSigV4.ts`で自前実装）から実在商品を取得し、テーマとの関連性・収益期待値でスコアリングして`Product`に保存。Amazon側は実アカウントでの動作確認は未実施（利用条件を満たすAssociatesアカウントが必要）。楽天側は2026年の新API基盤（`RAKUTEN_ACCESS_KEY`によるBearer認証 + `RAKUTEN_REFERER_URL`一致必須）に対応済みだが、開発環境のネットワーク制限によりライブ疎通は未確認 |
| 商品開発AI/アプリ開発AI | Phase6・Phase9で実装 | 自社商品企画・アプリ化判断 |
| 品質チェックAI | **実装**（`lib/quality/checker.ts`） | 投稿前チェック（§20相当）。severity:highの指摘があれば`status:"flagged"`とし、承認（approve）をブロックする |

媒体別AIは `lib/generators/` に「共通インターフェース (`ContentGeneratorSpec`) + プラットフォームごとのプロンプト定義」として実装しており、`lib/generators/index.ts` のレジストリに1行追加するだけで新しい媒体を追加できる（拡張可能設計）。生成された台本・原稿は `Content.body` にJSON文字列として保存し、`Content.status` を `draft`（企画のみ）→`review`（詳細生成済み・要確認）→`approved`（承認済み。実際の自動投稿はPhase5のPublisherで実装）と遷移させる。これはSAFE MODE（§13）の「AI生成→人間確認→投稿」の最初の2段階に対応する。

各エージェントは「Claude APIへの特定用途プロンプト + 入出力スキーマ」として実装し、将来的にAI Routerが呼び出し先モデルを切り替えられるようにする。

---

## 11. API連携構成

### 11.1 認証・秘匿情報管理

すべてのAPIキーは `.env`（ローカル）/ Vercel Environment Variables（本番）で管理し、コードに直書きしない。`.env.example` に必要な変数名一覧を用意する。

### 11.2 データ収集層（Signal Sources）

```ts
interface SignalSource {
  name: string;
  isConfigured(): boolean;      // APIキー未設定なら false
  fetchSignals(seed?: string): Promise<Signal[]>; // 未設定時は空配列 + ログ警告
}
```

Phase1では `googleTrends`（キー不要の代替手段を優先）と `youtube`（APIキー設定時のみ有効）を実装。楽天・Amazonは Phase4（アフィリエイトAI）で本格実装。

### 11.3 コンテンツ生成層

Claude APIをコアに、画像・音声・動画は Phase3 で個別コネクタを追加。

### 11.4 AI選択ルーター（AI Router）

```ts
type TaskKind = "research_summarize" | "scoring" | "planning" | "long_form_script"
  | "short_copy" | "image" | "video" | "tts";

function routeTask(kind: TaskKind): { provider: string; model: string } {
  // Phase1: すべてClaudeに固定しつつ、タスク種別ごとにモデルを切替える
  // - research_summarize / scoring / planning / long_form_script → claude-sonnet-5
  // - short_copy（大量の短文） → claude-haiku-4-5
  // Phase3以降、画像/音声/動画やOpenAI/Geminiとのコスト比較ロジックを追加
}
```

### 11.5 投稿・収益連携層（Publishers）

```ts
interface Publisher {
  platform: string;
  isConfigured(): boolean;
  publish(content: ContentDraft): Promise<PublishResult>;
}
```

`lib/publishing/` に実装済み。`x_post` / `x_thread` は X API v2への実投稿Publisher（`lib/publishing/publishers/xPublisher.ts`、OAuth 1.0a自前実装）が環境変数設定時に有効になり、それ以外のplatformは `manualExportPublisher`（コピペ用テキスト整形のみ、外部API呼び出しなし）にフォールバックする。`GET /api/topics/[id]` から `getPublisher(platform)` で解決し、`POST /api/contents/:id/publish` がフォールバック時は自動投稿せずエラー+コピペ用テキストのみ返す設計になっている。各媒体の公式投稿APIをPublisherとして追加する際は、§13の自動化レベル（SAFE MODE / SEMI AUTO / FULL AUTO）をPublisher呼び出しの前段でチェックすること。

---

## 12. セキュリティ設計

- APIキーは環境変数のみで管理し、リポジトリにコミットしない（`.gitignore` に `.env*` を含める）
- ダッシュボードは最低限Basic認証必須（Phase1）、Phase2でSupabase Authに移行しロール管理（管理者/閲覧者）を導入
- 外部公開APIエンドポイント（投稿トリガー等）はAPIキー or 署名検証を必須にする
- SNS投稿・アフィリエイトリンクの生成は必ず各サービスの規約・表示義務（広告表記・アフィリエイト表記）を満たすようテンプレート側で強制する
- 生成コンテンツはPhase6の品質チェックAIを通過するまで自動投稿しない（§13, §20）
- ログにAPIキーやトークンを出力しない
- Discord Bot・Webhookは署名検証・IP/レート制限を実装（Phase8）

---

## 13. 投稿自動化設計

3段階の自動化レベルをContentステータスとして管理する。

| モード | フロー | 実装Phase |
|---|---|---|
| SAFE MODE | AI生成 → 人間確認 → 投稿 | Phase5（デフォルト） |
| SEMI AUTO | AI生成 → AI品質チェック → 人間最終確認 → 自動投稿 | Phase6〜7 |
| FULL AUTO | AI生成 → AI品質チェック → 自動投稿 | Phase9（規約・リスクを十分検証した媒体のみ） |

`Content.status` は `draft → review → flagged → approved → scheduled → published → failed` の状態遷移で管理し、各媒体のPublisherがAPI制限・規約に抵触する処理を検知した場合は自動投稿を行わず `review`/`flagged` に差し戻す。

**現在の実装状況（SAFE MODEの最初のステップとして実装済み）:**
`draft`（企画のみ）→ 詳細生成AI実行 → `review`（台本/原稿生成済み）→ 品質チェックAI実行 → `review`（合格）or `flagged`（高リスク指摘あり、要修正）→ 人間が承認 → `approved` → `scheduled`（投稿予定にする）or 実Publisherで即時投稿 → `published`（投稿完了）。
承認（approve）は品質チェックAIが `passed` を返していない限りブロックされる（§20）。
実際の投稿は Publisher インターフェース（`lib/publishing/`）が担う。`x_post`/`x_thread` は X API v2への実投稿（`xPublisher`）を実装済みで、`X_API_KEY`等が設定されていれば `POST /api/contents/:id/publish` が実際にツイート/スレッドを投稿し `status: published` と `publishedUrl` を記録する。それ以外のplatformは `manualExportPublisher`（人間がそのままSNS/ブログの投稿画面に貼り付けられるテキストを整形して返すのみで、外部APIは呼び出さない）にフォールバックし、投稿確認は人間が「投稿完了にする」で手動記録する。YouTube Data API / Instagram Graph API 等は動画・複数画像生成（Phase3の続き）が前提のため未実装、noteは公式APIが存在しないため実装していない。SEMI AUTO・FULL AUTOは、対象platformで実Publisherが揃い、規約・リスクを十分検証してから解禁する。

---

## 14. 収益分析設計

- 媒体別に取得可能な指標を `Analytics`（コンテンツ単位）と `Revenue`（収益単位）に正規化して格納
- `AiUsageLog` で「コンテンツ制作あたりのAIコスト」を積み上げ、`Revenue - AiCost - その他コスト` で利益を算出（§26相当のROI最適化）
- 日次バッチ（Vercel Cron、Phase2以降）で各媒体APIから指標を取得し、DBへ反映 — **現状は未実装**。各媒体の分析APIは審査・OAuth連携が必要なため、`POST /api/revenue` による手動登録で暫定運用する
- ダッシュボードのROIパネル（`GET /api/roi`）で、テーマ単位の「AIコスト(USD→JPY換算) vs 収益(JPY)」を算出し、赤字テーマを停止（`Topic.status = "archived"`）できるようにしている（**実装済み**）。為替レートは `USD_JPY_RATE` 環境変数による概算（デフォルト150円）であり、リアルタイム為替APIは導入していない

---

## 15. Discord連携設計（Phase8・実装済み）

`discord-bot/`（Next.jsアプリとは別package.jsonの常駐Node.jsプロセス）にdiscord.jsでBotを実装し、以下のスラッシュコマンドを提供する。

`/start` `/status` `/report` `/trends` `/create [genre]` `/approve [content_id]` `/schedule` `/top` `/stop` `/pause`

Botは既存のREST API（`/api/*`）を呼び出すクライアントとして実装し、ダッシュボードと同じビジネスロジックを再利用している（ロジックの二重実装を避ける）。Discord Gatewayへの常時接続が必要なため、Vercel等のサーバーレス環境ではなく常駐可能な環境（VPS等）で動かす。`/stop` `/pause` は、常時稼働する自動処理（スケジューラ）自体がPhase9まで実装されないため、現時点では「対象がない」旨を返す誠実な実装にしている（本物のON/OFFにはPhase9のスケジューラ実装が必要）。

---

## 16. Phase 1〜9 開発計画

| Phase | 内容 | 本実装での状況 |
|---|---|---|
| 1 | AI収益司令塔（ダッシュボード・市場調査AI・テーマランキング・収益期待値・コンテンツ企画） | **実装済み** |
| 2 | コンテンツ生成（YouTube台本・Shorts・Instagram・TikTok・X・note・ブログ） | **実装済み** |
| 3 | 画像・動画・音声生成API選定・連携 | **一部実装**（OpenAI Images API[gpt-image-1]でサムネイル画像、OpenAI TTS API[tts-1]でナレーション音声を生成。`OPENAI_API_KEY`未設定時は自動スキップ。生成物はローカル`public/generated/`に保存する初期実装で、本番はStorage差し替えが必要。動画生成は高コストのため引き続き未着手） |
| 4 | アフィリエイト管理（Amazon/楽天/ASP比較・自動選定） | **一部実装**（楽天ウェブサービスAPI・Amazon PA-API 5.0[SigV4自前実装] + アフィリエイトAIによる商品選定・スコアリングを実装。Amazonは実アカウントでの動作未確認。ASP連携は未着手） |
| 5 | 投稿API連携（SAFE MODE中心） | **一部実装**（`approved → scheduled → published` の状態遷移、コピペ投稿用テキスト出力[Publisher: manualExport]に加え、**X (Twitter) API v2への実投稿**[OAuth 1.0a自前実装]を実装。YouTube/Instagram/TikTok等は動画・複数画像生成が前提のため未実装、noteは公式APIが存在しないため未実装） |
| 6 | 収益分析・AI品質チェック | **一部実装**（品質チェックAIを実装し、承認には品質チェック合格が必須。収益・視聴回数等を各媒体APIから自動取得する分析機能は未着手で、Phase7の手動収益登録で代替） |
| 7 | AI自己改善ループ・ROI最適化・AI CEO | **一部実装**（テーマ別のAIコスト対収益[ROI]算出・赤字テーマの停止操作を実装。過去の成功パターンを翌日の企画に自動反映する自己改善ループ、AI CEOによる全体戦略立案は未着手） |
| 8 | Discord操作 | **実装済み**（`discord-bot/`。`/start /status /report /trends /create /approve /schedule /top /stop /pause` を実装し、既存REST APIを呼び出すクライアントとして動作。`/stop`/`/pause`は常時稼働の自動処理自体が未実装のため参考情報を返す） |
| 9 | 完全自動化（FULL AUTO、規約検証済み媒体のみ） | 意図的に未実装（Phase5で各媒体の公式投稿APIが揃い、規約・リスクを十分検証できるまでは実装しない） |

各Phaseの着手前に、対象範囲のAPI規約・料金・技術選定を再調査した上で本DESIGN.mdを更新すること。
