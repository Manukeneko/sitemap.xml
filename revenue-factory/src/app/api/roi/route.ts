import { NextResponse } from "next/server";
import { computeTopicRoi } from "@/lib/roi/engine";

export const dynamic = "force-dynamic";

// GET /api/roi — テーマ別のAIコスト対収益（DESIGN.md §14, §26）
export async function GET() {
  const roi = await computeTopicRoi();
  return NextResponse.json({ roi });
}
