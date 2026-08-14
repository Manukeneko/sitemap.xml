import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateImageForContent } from "@/lib/media/generateForContent";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/media/image — サムネイル画像を生成する（Phase3、任意設定）
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const content = await db.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }

  try {
    const asset = await generateImageForContent(content);
    return NextResponse.json({ asset });
  } catch (err) {
    console.error("[contents/media/image] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 400 }
    );
  }
}
