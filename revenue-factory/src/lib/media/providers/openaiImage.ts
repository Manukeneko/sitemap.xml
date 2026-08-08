import type { ImageProvider } from "@/lib/media/types";

// OpenAI Images API (gpt-image-1) を利用したサムネイル画像生成コネクタ。
// OPENAI_API_KEY が未設定の場合は isConfigured() が false になり、呼び出し側でスキップする。
// SDKは追加せず、YouTube/Rakutenコネクタと同様に生のfetchで呼び出している（DESIGN.md §3, §11.3）。
export const openaiImageProvider: ImageProvider = {
  name: "openai",
  model: "gpt-image-1",
  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  async generateImage(prompt: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI Images API error: ${res.status} ${errText.slice(0, 300)}`);
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];
    if (!item) {
      throw new Error("OpenAI Images API returned no image data");
    }

    if (item.b64_json) {
      return { buffer: Buffer.from(item.b64_json, "base64"), mimeType: "image/png" };
    }
    if (item.url) {
      const imgRes = await fetch(item.url);
      if (!imgRes.ok) throw new Error(`Failed to download generated image: ${imgRes.status}`);
      const arrayBuffer = await imgRes.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType: imgRes.headers.get("content-type") ?? "image/png",
      };
    }
    throw new Error("OpenAI Images API returned neither b64_json nor url");
  },
};
