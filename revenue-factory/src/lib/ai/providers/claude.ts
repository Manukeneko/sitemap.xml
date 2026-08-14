import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!isClaudeConfigured()) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env before calling AI-dependent endpoints."
    );
  }
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

export interface ClaudeCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function callClaude(params: {
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<ClaudeCallResult> {
  const client = getClient();
  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 4096,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// Claudeにschema指定のJSONを生成させ、パースして返す。
// コードフェンスや前置き文が混ざっても抽出できるよう最初の { ... } / [ ... ] を探す。
export async function callClaudeJson<T>(params: {
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
  const result = await callClaude({
    ...params,
    system: `${params.system}\n\n必ず有効なJSONのみを出力してください。説明文やMarkdownのコードフェンスは付けないでください。`,
  });

  const jsonText = extractJson(result.text);
  let data: T;
  try {
    data = JSON.parse(jsonText) as T;
  } catch (err) {
    throw new Error(
      `Claudeの応答をJSONとしてパースできませんでした: ${(err as Error).message}\n応答: ${result.text.slice(0, 500)}`
    );
  }

  return { data, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  const firstBrace = candidate.search(/[[{]/);
  if (firstBrace === -1) return candidate;
  return candidate.slice(firstBrace).trim();
}
