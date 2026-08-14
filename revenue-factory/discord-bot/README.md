# AI収益工場 — Discord操作パネル（Phase 8）

DESIGN.md §15, §18 の実装です。discord.jsでスラッシュコマンドを実装し、`revenue-factory`（Next.jsアプリ）の
REST APIを呼び出すクライアントとして動作します。ビジネスロジックは二重実装せず、常にダッシュボード側のAPIを呼びます。

Next.jsアプリ（`revenue-factory/`）とは別プロセス・別`package.json`で動作します。Discord Botは
Gatewayへの常時接続が必要なため、Vercel等のサーバーレス環境ではなく、常駐プロセスとして起動できる環境
（VPS、Fly.io、Railway等）で動かしてください。

## 実装済みコマンド

| コマンド | 内容 | 実データ |
|---|---|---|
| `/start` | 稼働状況の概要を表示 | ✅ `/api/stats` |
| `/status` | 今日の実績・承認待ち/投稿予定件数 | ✅ `/api/stats`, `/api/contents` |
| `/report` | 今日・累計の収益レポート | ✅ `/api/stats`, `/api/roi`（収益は手動登録分のみ） |
| `/trends` | テーマランキング上位10件 | ✅ `/api/topics` |
| `/create [genre]` | 市場調査AIを実行 | ✅ `/api/research/run` |
| `/approve [content_id]` | 承認待ち一覧表示 / 指定IDを承認 | ✅ `/api/contents`, `/api/contents/:id/approve` |
| `/schedule` | 投稿予定のコンテンツ一覧 | ✅ `/api/contents?status=scheduled` |
| `/top` | 最も稼いだコンテンツ（直近の収益記録から集計） | ✅ `/api/revenue` |
| `/stop` / `/pause` | 参考情報を表示 | ⚠️ 常時稼働の自動処理自体がPhase9まで未実装のため、実際の停止対象はありません |

## セットアップ

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成し、Botを追加
2. `cp .env.example .env` して `DISCORD_BOT_TOKEN` / `DISCORD_CLIENT_ID` を設定
3. `revenue-factory/`（Next.jsアプリ）を先に起動しておく（`npm run dev`）。`DASHBOARD_API_BASE_URL` はそのURLを指す
4. Botをサーバーに招待（`applications.commands` + `bot` スコープ、最低限の権限で可）

```bash
cd discord-bot
npm install
cp .env.example .env
# .env を編集
npm run register   # スラッシュコマンドを登録（開発中はDISCORD_GUILD_IDを設定すると即反映）
npm run start       # Bot起動
```

## 未実装・既知の制約

- `/stop` `/pause` は現状ダミーではなく「対象がない」ことを正直に返す実装にしています。DESIGN.md §16 の
  Phase9（完全自動化・常時稼働スケジューラ）を実装した際に、実際にON/OFFを切り替えられるようにする予定です。
- 承認には品質チェックAIが `passed` を返している必要があります（ダッシュボード側の `/api/contents/:id/approve` が強制）。
