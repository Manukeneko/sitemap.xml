import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

// 生成物(画像/音声)の保存先。
// Vercel等のサーバーレス環境はデプロイされたファイルシステムが読み取り専用のため、
// public/generated/への書き込みは本番で失敗する(ENOENT)。BLOB_READ_WRITE_TOKEN
// (Vercelプロジェクトで Storage → Blob を作成すると自動付与される)が設定されて
// いればVercel Blobに保存し、公開URLを返す。未設定時(ローカル開発時)は従来通り
// public/generated/に保存する。
const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

export async function saveGeneratedFile(
  contentId: string,
  kind: string,
  buffer: Buffer,
  ext: string
): Promise<string> {
  const filename = `${kind}-${Date.now()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`generated/${contentId}/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const dir = path.join(GENERATED_DIR, contentId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  // public/ 配下なのでNext.jsが /generated/... としてそのまま配信する
  return `/generated/${contentId}/${filename}`;
}
