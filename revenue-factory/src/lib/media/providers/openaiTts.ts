import type { TtsProvider } from "@/lib/media/types";

// OpenAI TTS API (tts-1) を利用したナレーション音声生成コネクタ。
// OPENAI_API_KEY が未設定の場合は isConfigured() が false になり、呼び出し側でスキップする。
export const openaiTtsProvider: TtsProvider = {
  name: "openai",
  model: "tts-1",
  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  async synthesize(text: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      // tts-1 の入力上限(4096文字)を超えないよう安全側で切り詰める
      body: JSON.stringify({ model: "tts-1", voice: "alloy", input: text.slice(0, 4000) }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI TTS API error: ${res.status} ${errText.slice(0, 300)}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mimeType: "audio/mpeg" };
  },
};
