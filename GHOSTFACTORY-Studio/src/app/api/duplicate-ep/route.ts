import { NextResponse } from "next/server";
import { appendEpToHistory, exportEpPackage, getEpHistory, normalizeStoredEp, updateIdeaMemoryFromEp } from "@/lib/storage";
import type { GhostEp } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const sourceId = String(body.epId || "");
  const history = await getEpHistory();
  const source = history.find((ep) => ep.id === sourceId);
  if (!source) return NextResponse.json({ error: "EP not found" }, { status: 404 });

  const now = new Date().toISOString();
  const date = now.slice(0, 10);
  const copy: GhostEp = normalizeStoredEp({
    ...source,
    id: `EP-${date}-${Date.now()}`,
    title: `${source.title || source.id} Copy`,
    date,
    status: "prompt_ready",
    duplicateCheck: { isDuplicate: false, similarityScore: 0 },
    createdAt: now,
    updatedAt: now
  });

  await appendEpToHistory(copy);
  await exportEpPackage(copy, body.outputRootOverride);
  await updateIdeaMemoryFromEp(copy);
  return NextResponse.json({ ep: copy });
}
