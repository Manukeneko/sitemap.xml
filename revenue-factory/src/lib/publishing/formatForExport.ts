// 生成済みContent.body（媒体ごとのJSON）を、人間がそのままコピーして各SNS/ブログの
// 投稿画面に貼り付けられるプレーンテキストに整形する。
// 各SNSの公式投稿APIはPhase5後半で規約・審査を確認しながら順次追加する想定で、
// それまではこの「コピペ用テキスト出力」が実質的なPublisherとして機能する（DESIGN.md §13）。
export function formatForExport(platform: string, title: string, body: string): string {
  let detail: Record<string, unknown>;
  try {
    detail = JSON.parse(body);
  } catch {
    return body; // draftのまま(未詳細生成)ならそのまま返す
  }

  const lines: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    lines.push(`【${label}】\n${formatValue(value)}`);
  };

  lines.push(`--- ${platform} / ${title} ---`);
  push("タイトル", detail.title);
  push("フック", detail.hook);
  push("台本", detail.script);
  push("CTA", detail.cta);
  push("概要欄", detail.description);
  push("ハッシュタグ", detail.hashtags);
  push("サムネイル案", detail.thumbnailIdeas);
  push("Shorts一覧", detail.shorts);
  push("スライド", detail.slides);
  push("キャプション", detail.caption);
  push("投稿本文", detail.text);
  push("スレッド", detail.tweets);
  push("スレッド最後のCTA", detail.finalCta);
  push("本文", detail.body);
  push("有料への誘導", detail.paidTeaser);
  push("無料プレビュー", detail.freePreview);
  push("有料部分", detail.paidBody);
  push("推奨価格(円)", detail.suggestedPriceJpy);
  push("メタディスクリプション", detail.metaDescription);
  push("対象キーワード", detail.targetKeywords);
  push("見出し構成", detail.headings);
  push("FAQ", detail.faq);
  push("内部リンク案", detail.internalLinkSuggestions);

  if (lines.length === 1) {
    // 既知のフィールドが無かった場合はJSON全体を出す
    return `${lines[0]}\n\n${JSON.stringify(detail, null, 2)}`;
  }
  return lines.join("\n\n");
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "object" ? JSON.stringify(v) : `- ${String(v)}`))
      .join("\n");
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
