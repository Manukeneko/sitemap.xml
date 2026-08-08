import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/approve
// SAFE MODEにおける「人間確認」を通過させる操作。品質チェックAI（§20）で passed
// になっていることを前提とする（未チェック/flagged状態では承認をブロックする）。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const content = await db.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }
  if (content.status !== "review") {
    return NextResponse.json(
      { error: `status "${content.status}" は承認できません（review状態のみ承認可能）` },
      { status: 400 }
    );
  }
  if (content.qualityStatus !== "passed") {
    return NextResponse.json(
      { error: "品質チェックAIをpassedにしてから承認してください（未チェック、またはflaggedの可能性があります）" },
      { status: 400 }
    );
  }

  const updated = await db.content.update({
    where: { id: content.id },
    data: { status: "approved" },
  });

  return NextResponse.json({ content: updated });
}
