import { NextResponse } from "next/server";
import { updateEpStatus } from "@/lib/storage";
import type { EpStatus } from "@/lib/types";

const statuses: EpStatus[] = ["idea", "prompt_ready", "frame_ready", "video_ready", "posted", "archived"];

export async function POST(request: Request) {
  const body = (await request.json()) as { epId?: string; status?: EpStatus };
  if (!body.epId || !body.status || !statuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid epId or status" }, { status: 400 });
  }

  const ep = await updateEpStatus(body.epId, body.status);
  if (!ep) {
    return NextResponse.json({ error: "EP not found" }, { status: 404 });
  }

  return NextResponse.json({ ep });
}
