# AI収益工場 — Phase 1〜2: AI収益司令塔 + コンテンツ生成

「何を作れば最も収益につながるかをAIが判断し、改善し続けるシステム」の Phase 1〜2 実装です。
全体設計は [`DESIGN.md`](./DESIGN.md) を参照してください。

実装済みの機能:

**Phase 1: AI収益司令塔**
- 市場調査AI（外部シグナル + Claudeによるテーマ発掘）
- 収益性スコアリングAI（検索需要・SNS需要・競合度・アフィリエイト適性等を0-100で採点し、総合収益期待値を算出）
- テーマランキングダッシュボード
- コンテンツ企画AI（1テーマから YouTube/Instagram/TikTok/X/note/ブログ/デジタル商品 等、媒体別の企画を一括生成）
- AIコスト記録（`ai_usage_logs`）と今日/累計コストの可視化

**Phase 2: コンテンツ生成（媒体別AI）**
- YouTube AI: 長尺台本 + Shorts複数本の自動生成
- Instagram AI: Reels台本 + カルーセル構成
- TikTok AI: 冒頭フック重視の台本
- X AI: 通常投稿 + スレッド
- note AI: 無料記事 + 有料記事（有料への導線込み）
- SEOブログAI: 見出し構成・FAQ・メタディスクリプション込みの記事
- SAFE MODE（DESIGN.md §13）: 生成後は自動投稿せず `draft → review → approved` の状態で人間の確認を挟む

## セットアップ

```bash
cd revenue-factory
npm install
cp .env.example .env
# .env を編集し、最低限 ANTHROPIC_API_KEY を設定してください
npm run db:generate
npm run db:push
npm run db:seed   # 任意: サンプルデータを投入してダッシュボードの見た目を確認できます
npm run dev
```

http://localhost:3000 でダッシュボードが開きます。

## 必須の環境変数

| 変数 | 必須 | 説明 |
|---|---|---|
| `DATABASE_URL` | ✅ | 開発時は `file:./dev.db`（SQLite）でそのまま動作します |
| `ANTHROPIC_API_KEY` | ✅ | 市場調査・スコアリング・企画AIの実行に必要 |
| `YOUTUBE_API_KEY` | 任意 | 設定するとYouTubeの検索結果を市場調査AIの参考シグナルとして利用します |
| `SERPAPI_KEY` | 任意 | 設定するとGoogleトレンド関連クエリを市場調査AIの参考シグナルとして利用します（[SerpApi](https://serpapi.com/)） |

未設定のAPIは自動的にスキップされ、市場調査AIはClaudeの知識ベースのみで提案を行います（DESIGN.md §11.2）。

## 本番DB（Supabase等のPostgreSQL）への切り替え

1. `prisma/schema.prisma` の `datasource db` の `provider` を `"postgresql"` に変更
2. `DATABASE_URL` をSupabaseの接続文字列に変更
3. `npm run db:push`（または `npx prisma migrate deploy`）

## 使い方

1. ダッシュボード上部のフォームでジャンル・キーワードを入力し「今日のテーマを発掘する」を実行
   → 市場調査AIがテーマ候補を提案し、収益性スコアリングAIが採点してテーマランキングに追加されます
2. テーマをクリックして展開し、「コンテンツ企画を生成」を実行
   → 1テーマから YouTube/Instagram/TikTok/X/note/ブログ/PDF/電子書籍/テンプレート/アプリ化アイデア の企画案を一括生成します（`status: draft`）
3. 生成された企画（YouTube/Instagram/TikTok/X/note/ブログ）ごとに「詳細生成（台本/原稿）」を実行
   → 媒体別AIが台本・キャプション・見出し構成などを詳細生成します（`status: review`）。PDF/電子書籍/テンプレート/アプリ化アイデアの生成AIはPhase3〜4で実装予定です
4. 内容を確認し「承認する」を実行すると `status: approved` になります。実際のSNS/ブログへの自動投稿（Publisher連携）はPhase5で実装します

## ディレクトリ構成

`DESIGN.md` §8 を参照してください。新しい調査ソース（SNSトレンドAPI等）は `src/lib/research/sources/` に、新しいAIプロバイダは `src/lib/ai/providers/` に1ファイル追加するだけで拡張できる設計になっています。

## Next Phase

Phase 2〜9 の計画は `DESIGN.md` §16 を参照してください。
