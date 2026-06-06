import { NextResponse } from "next/server";
import { getTemplates, saveTemplates } from "@/lib/storage";
import type { GhostTemplate } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ templates: await getTemplates() });
}

export async function POST(request: Request) {
  const templates = (await request.json()) as GhostTemplate[];
  return NextResponse.json({ templates: await saveTemplates(templates) });
}
