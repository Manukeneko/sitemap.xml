import type { Content } from "@prisma/client";
import type { Publisher, PublishResult } from "@/lib/publishing/types";
import { buildOAuth1Header } from "@/lib/publishing/oauth1";
import { formatForExport } from "@/lib/publishing/formatForExport";

const TWEETS_ENDPOINT = "https://api.twitter.com/2/tweets";

function isConfigured(): boolean {
  return Boolean(
    process.env.X_API_KEY &&
      process.env.X_API_SECRET &&
      process.env.X_ACCESS_TOKEN &&
      process.env.X_ACCESS_TOKEN_SECRET
  );
}

async function postTweet(text: string, replyToId?: string): Promise<{ id: string }> {
  const consumerKey = process.env.X_API_KEY!;
  const consumerSecret = process.env.X_API_SECRET!;
  const token = process.env.X_ACCESS_TOKEN!;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET!;

  const authorization = buildOAuth1Header({
    method: "POST",
    url: TWEETS_ENDPOINT,
    consumerKey,
    consumerSecret,
    token,
    tokenSecret,
  });

  const body: Record<string, unknown> = { text: text.slice(0, 280) };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }

  const res = await fetch(TWEETS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as { data?: { id: string }; detail?: string; title?: string };
  if (!res.ok || !json.data) {
    throw new Error(`X API error: ${res.status} ${json.detail ?? json.title ?? ""}`);
  }
  return { id: json.data.id };
}

function parseBody(content: Content): Record<string, unknown> | null {
  try {
    return JSON.parse(content.body);
  } catch {
    return null;
  }
}

async function publish(content: Content): Promise<PublishResult> {
  if (!isConfigured()) {
    throw new Error("X_API_KEY等が設定されていません");
  }
  const detail = parseBody(content);
  if (!detail) {
    throw new Error("先に詳細生成を実行してください（企画段階のためJSON化されていません）");
  }

  const exportedText = formatForExport(content.platform, content.title, content.body);

  if (content.platform === "x_post") {
    const text = typeof detail.text === "string" ? detail.text : content.title;
    const hashtags = Array.isArray(detail.hashtags) ? detail.hashtags.join(" ") : "";
    const fullText = hashtags && !text.includes(hashtags) ? `${text}\n${hashtags}` : text;
    const { id } = await postTweet(fullText);
    return { success: true, exportedText, url: `https://x.com/i/web/status/${id}` };
  }

  if (content.platform === "x_thread") {
    const tweets = Array.isArray(detail.tweets) ? (detail.tweets as string[]) : [];
    if (tweets.length === 0) throw new Error("スレッド本文(tweets)が空です");
    const finalCta = typeof detail.finalCta === "string" ? detail.finalCta : undefined;
    const allTweets = finalCta ? [...tweets, finalCta] : tweets;

    let previousId: string | undefined;
    let firstId: string | undefined;
    for (const tweetText of allTweets) {
      const { id } = await postTweet(tweetText, previousId);
      if (!firstId) firstId = id;
      previousId = id;
    }
    return { success: true, exportedText, url: `https://x.com/i/web/status/${firstId}` };
  }

  throw new Error(`xPublisher does not handle platform "${content.platform}"`);
}

export const xPostPublisher: Publisher = { platform: "x_post", isConfigured, publish };
export const xThreadPublisher: Publisher = { platform: "x_thread", isConfigured, publish };
