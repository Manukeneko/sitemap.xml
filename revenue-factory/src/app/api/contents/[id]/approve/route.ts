import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/approve
// SAFE MODEにおける「人間確認」を通過させる操作。実際の投稿(Publisher)はPhase5で実装する。
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

  const updated = await db.content.update({
    where: { id: content.id },
    data: { status: "approved" },
  });

  return NextResponse.json({ content: updated });
}
