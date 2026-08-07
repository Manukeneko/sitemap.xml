# 検定ラボ — 検定アプリ量産テンプレート

検定・資格の練習問題アプリを「問題データを追加するだけ」で量産できる静的サイトのテンプレートです。ビルドの依存パッケージはゼロ(Node標準機能のみ)。

## 仕組み

```
exams/*.json      ← 検定ごとの問題データ(ここを増やすだけで新アプリが増える)
template/*.html   ← 共通のページテンプレート(HTML1枚)
assets/           ← 共通CSS/JS(全検定共通のクイズエンジン)
build.js          ← 上記から docs/ を自動生成(sitemap.xml・robots.txtも生成)
docs/             ← 生成物。GitHub Pagesの公開フォルダ
```

## 新しい検定アプリを追加する

1. `exams/` に新しいJSONファイルを作る(`exams/jishu-hozenshi.json` を参考に)

```json
{
  "slug": "example-kentei",
  "title": "〇〇検定 練習問題",
  "shortTitle": "〇〇検定",
  "description": "検定の説明文(SEOのdescriptionにも使われます)",
  "category": "カテゴリ名",
  "questions": [
    { "q": "問題文", "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"], "answer": 0, "explanation": "解説文" }
  ]
}
```

2. ビルドする

```
node build.js
```

3. `docs/` の中身をコミット&プッシュすれば、GitHub Pagesの設定(Settings → Pages → Branch: main, Folder: /docs)で即公開されます。

AIに問題データ生成を任せる場合は「上記JSON形式で、〇〇検定の練習問題を10問作って」と依頼すれば、そのまま`exams/`に追加できます。ただし資格試験の内容は正確性が重要なので、公開前に人が内容をレビューしてください。

## 収益化の想定ルート

- ページ内広告(Google AdSenseなど)
- SNS(Threads/Instagram)への出題クイズ自動投稿 → アプリへの導線
- 検定名+過去問で検索されるSEO流入
- noteなどでの詳しい解説コンテンツ販売への誘導

## 現在収録中の検定

- 自主保全士検定(`exams/jishu-hozenshi.json`) — パイロット版。内容は一般的なTPM/自主保全知識をもとにした練習問題で、実際の試験監修は未実施です。公開前に内容の正確性を確認してください。
