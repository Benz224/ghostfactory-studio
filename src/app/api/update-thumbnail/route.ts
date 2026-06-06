import { NextResponse } from "next/server";
import { updateEpThumbnail } from "@/lib/storage";

export async function POST(request: Request) {
  const body = await request.json();
  const ep = await updateEpThumbnail(body.epId, body.thumbnailImage ?? "");
  if (!ep) {
    return NextResponse.json({ error: "EP not found" }, { status: 404 });
  }
  return NextResponse.json({ ep });
}
