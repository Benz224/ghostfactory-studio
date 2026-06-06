import { NextResponse } from "next/server";
import { updateEpPartial } from "@/lib/storage";
import type { GhostEp } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const ep = await updateEpPartial(body.epId, body.patch as Partial<GhostEp>);
  if (!ep) return NextResponse.json({ error: "EP not found" }, { status: 404 });
  return NextResponse.json({ ep });
}
