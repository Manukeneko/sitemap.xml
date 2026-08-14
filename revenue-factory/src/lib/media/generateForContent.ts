import type { Content } from "@prisma/client";
import { db } from "@/lib/db";
import { openaiImageProvider } from "@/lib/media/providers/openaiImage";
import { openaiTtsProvider } from "@/lib/media/providers/openaiTts";
import { saveGeneratedFile } from "@/lib/media/storage";
import { estimateImageCostUsd, estimateTtsCostUsd, logMediaUsage } from "@/lib/media/costLogger";

function parseBody(content: Content): Record<string, unknown> | null {
  try {
    return JSON.parse(content.body);
  } catch {
    return null;
  }
}

function extractImagePrompt(content: Content): string {
  const detail = parseBody(content);
  const ideas = detail?.thumbnailIdeas;
  const firstIdea = Array.isArray(ideas) && typeof ideas[0] === "string" ? ideas[0] : undefined;
  const base = firstIdea ?? (typeof detail?.title === "string" ? detail.title : content.title);
  return `YouTube/SNS用サムネイル画像。テキストなしのビジュアルのみ。内容: ${base}`;
}

function extractNarrationText(content: Content): string {
  const detail = parseBody(content);
  const script = typeof detail?.script === "string" ? detail.script : undefined;
  const body = typeof detail?.body === "string" ? detail.body : undefined;
  return script ?? body ?? content.title;
}

export async function generateImageForContent(content: Content) {
  if (!openaiImageProvider.isConfigured()) {
    throw new Error("OPENAI_API_KEY が設定されていません。画像生成にはOpenAI APIキーが必要です。");
  }
  const prompt = extractImagePrompt(content);
  const { buffer, mimeType } = await openaiImageProvider.generateImage(prompt);
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const filePath = await saveGeneratedFile(content.id, "image", buffer, ext);
  const costUsd = estimateImageCostUsd();

  await logMediaUsage({
    kind: "image",
    provider: openaiImageProvider.name,
    model: openaiImageProvider.model,
    costUsd,
    relatedContentId: content.id,
  });

  return db.mediaAsset.create({
    data: {
      contentId: content.id,
      kind: "image",
      provider: openaiImageProvider.name,
      model: openaiImageProvider.model,
      prompt,
      filePath,
      mimeType,
      costUsd,
    },
  });
}

export async function generateAudioForContent(content: Content) {
  if (!openaiTtsProvider.isConfigured()) {
    throw new Error("OPENAI_API_KEY が設定されていません。音声生成にはOpenAI APIキーが必要です。");
  }
  const text = extractNarrationText(content);
  const { buffer, mimeType } = await openaiTtsProvider.synthesize(text);
  const filePath = await saveGeneratedFile(content.id, "audio", buffer, "mp3");
  const costUsd = estimateTtsCostUsd(text.length);

  await logMediaUsage({
    kind: "audio",
    provider: openaiTtsProvider.name,
    model: openaiTtsProvider.model,
    costUsd,
    relatedContentId: content.id,
  });

  return db.mediaAsset.create({
    data: {
      contentId: content.id,
      kind: "audio",
      provider: openaiTtsProvider.name,
      model: openaiTtsProvider.model,
      prompt: null,
      filePath,
      mimeType,
      costUsd,
    },
  });
}
