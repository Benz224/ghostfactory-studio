import { NextResponse } from "next/server";
import { defaultChecklist, updateEpChecklist } from "@/lib/storage";
import type { ProductionChecklist } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { epId?: string; checklist?: ProductionChecklist };
  if (!body.epId || !body.checklist) {
    return NextResponse.json({ error: "Invalid epId or checklist" }, { status: 400 });
  }

  const ep = await updateEpChecklist(body.epId, { ...defaultChecklist, ...body.checklist });
  if (!ep) {
    return NextResponse.json({ error: "EP not found" }, { status: 404 });
  }

  return NextResponse.json({ ep });
}
