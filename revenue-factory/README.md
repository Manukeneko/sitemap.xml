# AI収益工場 — Phase 1・2・3・4・5・6・7・8 実装済み（Phase9は意図的に未実装）

「何を作れば最も収益につながるかをAIが判断し、改善し続けるシステム」の実装です。
全体設計は [`DESIGN.md`](./DESIGN.md) を参照してください（Phase進捗は §16 に一覧があります）。

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

**Phase 6: 品質チェックAI**
- 誤情報・著作権・商標・広告表記漏れ・誇大表現・低品質/重複コンテンツ等をClaudeがチェック
- `severity: high` の指摘があれば `status: flagged` にし、品質チェック合格（`qualityStatus: passed`）まで承認をブロック

**Phase 4: アフィリエイトAI**
- 楽天ウェブサービスAPI + Amazon PA-API 5.0（AWS SigV4署名を自前実装）から実在の商品を検索し、テーマとの関連性・収益期待値でAIが選定・スコアリング
- Amazon側はコード上は実装済みですが、Associatesプログラムの利用条件（実績要件）を満たすアカウントでの動作確認はできていません

**Phase 5: 投稿ワークフロー**
- `approved → scheduled → published` の状態遷移を実装
- **X (Twitter) API v2への実投稿**（OAuth 1.0a署名を自前実装）に対応。`X_API_KEY`等を設定すると`x_post`/`x_thread`は「実APIで投稿する」ボタンから実際にツイート/スレッドが投稿されます
- それ以外の媒体（公式投稿API未接続）は「コピペしてそのまま投稿できるテキスト」を生成する `manualExportPublisher` で代替します

**Phase 7: ROI最適化**
- 収益実績の手動登録（`POST /api/revenue`）と、テーマ別のAIコスト対収益（ROI）算出
- 赤字テーマをダッシュボードから停止（`Topic.status: archived`）できる

**Phase 3: 画像・音声生成**
- OpenAI Images API（gpt-image-1）でサムネイル画像、OpenAI TTS API（tts-1）でナレーション音声を生成
- `OPENAI_API_KEY` 未設定時は自動スキップ。生成物は `public/generated/` にローカル保存（本番はStorage差し替えが必要）

**Phase 8: Discord操作パネル**
- `discord-bot/`（別プロセス）に `/start /status /report /trends /create /approve /schedule /top /stop /pause` を実装
- 詳細は [`discord-bot/README.md`](./discord-bot/README.md) を参照

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

## テスト

外部APIキーが無くても実行できる純粋関数（収益性スコアリングの加重平均、AWS SigV4/OAuth 1.0a署名、
コピペ用テキスト整形）をVitestでユニットテストしています。

```bash
npm run test
```

`npm audit` で Next.js 14.2系・vitest配下のesbuild(dev専用)に既知の脆弱性報告があります。Next.js側の修正はメジャーバージョン(15/16系)への移行が必要で、本セッションでは着手していません。本番投入前に対応を検討してください。

http://localhost:3000 でダッシュボードが開きます。

## 必須の環境変数

| 変数 | 必須 | 説明 |
|---|---|---|
| `DATABASE_URL` | ✅ | 開発時は `file:./dev.db`（SQLite）でそのまま動作します |
| `ANTHROPIC_API_KEY` | ✅ | 市場調査・スコアリング・企画AIの実行に必要 |
| `YOUTUBE_API_KEY` | 任意 | 設定するとYouTubeの検索結果を市場調査AIの参考シグナルとして利用します |
| `SERPAPI_KEY` | 任意 | 設定するとGoogleトレンド関連クエリを市場調査AIの参考シグナルとして利用します（[SerpApi](https://serpapi.com/)） |
| `RAKUTEN_APP_ID` | 任意 | 設定するとアフィリエイトAIが楽天市場の実在商品を検索・選定できます（[楽天ウェブサービス](https://webservice.rakuten.co.jp/)） |
| `USD_JPY_RATE` | 任意 | ROI算出時のドル円換算レート概算（デフォルト150） |
| `OPENAI_API_KEY` | 任意 | 設定するとサムネイル画像生成・ナレーション音声生成が使えます |
| `AMAZON_ACCESS_KEY` / `AMAZON_SECRET_KEY` / `AMAZON_PARTNER_TAG` | 任意 | 設定するとアフィリエイトAIがAmazonの実在商品も検索対象に含めます（Associatesプログラムの利用条件を満たすアカウントが必要） |
| `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` | 任意 | 設定すると`x_post`/`x_thread`の実投稿ができます |

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
   → 媒体別AIが台本・キャプション・見出し構成などを詳細生成します（`status: review`）。PDF/電子書籍/テンプレート/アプリ化アイデアの生成AIは今後のPhaseで実装予定です
4. `OPENAI_API_KEY` を設定している場合、詳細生成後に「サムネイル画像を生成」「ナレーション音声を生成」も実行できます
5. 「品質チェックを実行」を実行し、`qualityStatus: passed` になったら「承認する」を実行（`status: approved`）。高リスクな指摘があれば `status: flagged` となり、内容を修正して再チェックが必要です
6. `X_API_KEY`等を設定していて対象が`x_post`/`x_thread`の場合は「実APIで投稿する」で実際に投稿できます（成功すると自動的に`status: published`になります）。それ以外は「投稿予定にする」（`status: scheduled`）→ 実際に各SNS/ブログへ手動で投稿 →「投稿完了にする」（`status: published`）の順に進めます。「コピペ用テキストを表示」で投稿画面に貼り付けられるテキストを取得できます
7. 投稿後、実際の収益が発生したら `published` なコンテンツの欄から金額を入力して「収益を記録」を実行してください
8. テーマ展開時に「アフィリエイト商品候補を探す」を実行すると、楽天の実在商品からAIが紹介候補を選定します
9. ページ下部の「ROI（AIコスト対収益）」パネルで、テーマ別のAIコスト対収益を確認できます。赤字テーマは「このテーマを停止する」で止められます
10. Discordから操作したい場合は `discord-bot/` を別途起動してください（[discord-bot/README.md](./discord-bot/README.md)）

## ディレクトリ構成

`DESIGN.md` §8 を参照してください。新しい調査ソース（SNSトレンドAPI等）は `src/lib/research/sources/` に、新しいAIプロバイダは `src/lib/ai/providers/` に1ファイル追加するだけで拡張できる設計になっています。

## Next Phase

Phase 9（完全自動化）は、各媒体の公式投稿APIとの連携（現状は手動投稿用のテキスト出力のみ）が揃うまで意図的に未実装です。画像生成の動画版（Shorts等の自動編集）や、各媒体の分析APIによる自動データ取得（現状は収益の手動登録のみ）も今後の課題です。計画は `DESIGN.md` §16 を参照してください。
