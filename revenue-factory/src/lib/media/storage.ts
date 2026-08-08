import fs from "fs/promises";
import path from "path";

// Phase3の初期実装: 生成物をローカルファイルシステム(public/generated/)に保存する。
// 本番運用でVercel等のサーバーレス環境に載せる場合は、StorageAdapterインターフェースを
// 切り出してSupabase Storage等に差し替えること（DESIGN.md §2, §3）。
const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

export async function saveGeneratedFile(
  contentId: string,
  kind: string,
  buffer: Buffer,
  ext: string
): Promise<string> {
  const dir = path.join(GENERATED_DIR, contentId);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${kind}-${Date.now()}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  // public/ 配下なのでNext.jsが /generated/... としてそのまま配信する
  return `/generated/${contentId}/${filename}`;
}
