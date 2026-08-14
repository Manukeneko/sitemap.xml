import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/edit
// AI生成本文を人間が手直しするための編集エンドポイント（SAFE MODEの一部）。
// 投稿済み(published)は編集不可。編集すると過去の品質チェック結果は無効になるため
// qualityStatusをunchecked に戻し、承認/投稿予定まで進んでいた場合はreview状態に戻して
// 再度「品質チェック→承認」をやり直させる。
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const content = await db.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }
  if (content.status === "published") {
    return NextResponse.json(
      { error: "投稿済みのコンテンツは編集できません" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { body?: string };
  if (!body.body || !body.body.trim()) {
    return NextResponse.json({ error: "本文を入力してください" }, { status: 400 });
  }

  const revertStatus = content.status === "approved" || content.status === "scheduled";

  const updated = await db.content.update({
    where: { id: content.id },
    data: {
      body: body.body,
      qualityStatus: "unchecked",
      qualityNotes: null,
      ...(revertStatus ? { status: "review" } : {}),
    },
  });

  return NextResponse.json({ content: updated });
}
