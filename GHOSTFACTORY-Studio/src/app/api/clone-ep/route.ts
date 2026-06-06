import { NextResponse } from "next/server";
import { createChecklistFromParts } from "@/lib/checklist";
import { appendEpToHistory, getEpHistory } from "@/lib/storage";
import type { GhostEp } from "@/lib/types";

function cloneId() {
  const date = new Date().toISOString().slice(0, 10);
  return `EP-${date}-CLONE-${Date.now()}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const history = await getEpHistory();
  const source = history.find((ep) => ep.id === body.epId);
  if (!source) return NextResponse.json({ error: "EP not found" }, { status: 404 });

  const now = new Date().toISOString();
  const clone: GhostEp = {
    ...source,
    id: cloneId(),
    title: `${source.title || source.id} Clone`,
    status: "idea",
    thumbnailImage: body.copyAssets ? source.thumbnailImage : "",
    frameImages: body.copyAssets ? source.frameImages : {},
    checklist: createChecklistFromParts(source.frames, source.videos),
    duplicateCheck: { isDuplicate: false, similarityScore: 0 },
    createdAt: now,
    updatedAt: now
  };
  await appendEpToHistory(clone);
  return NextResponse.json({ ep: clone });
}
