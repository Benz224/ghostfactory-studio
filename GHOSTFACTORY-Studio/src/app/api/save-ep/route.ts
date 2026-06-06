import { NextResponse } from "next/server";
import path from "path";
import { appendEpToHistory, exportEpPackage, getEpHistory, normalizeStoredEp, updateIdeaMemoryFromEp } from "@/lib/storage";
import { checkDuplicate } from "@/lib/duplicate-checker";
import { ensureLockedPrompt } from "@/lib/ep-generator";
import type { GhostEp } from "@/lib/types";

function normalizeEp(ep: GhostEp, duplicateCheck: GhostEp["duplicateCheck"]): GhostEp {
  return normalizeStoredEp({
    ...ep,
    id: ep.id || `EP-${ep.date}-${Date.now()}`,
    date: ep.date || new Date().toISOString().slice(0, 10),
    status: "prompt_ready",
    projectId: ep.projectId || "default-project",
    characterId: ep.characterId || "meow",
    characterName: ep.characterName || "Meow",
    templateId: ep.templateId || "legacy",
    templateName: ep.templateName || "Legacy Meow",
    contentGoal: ep.contentGoal || "Entertainment",
    language: ep.language || "Thai",
    durationSec: (ep.durationSec ?? ep.videos.reduce((sum, video) => sum + (video.durationSec || 0), 0)) || Number(String(ep.format || "").match(/\d+(\.\d+)?/)?.[0] ?? 0),
    thumbnailImage: ep.thumbnailImage ?? "",
    frameImages: ep.frameImages ?? {},
    promptVersions: ep.promptVersions ?? [],
    plannedPostDate: ep.plannedPostDate ?? "",
    postedDate: ep.postedDate ?? "",
    analytics: {
      views: ep.analytics?.views ?? 0,
      likes: ep.analytics?.likes ?? 0,
      comments: ep.analytics?.comments ?? 0,
      shares: ep.analytics?.shares ?? 0,
      saves: ep.analytics?.saves ?? 0,
      revenue: ep.analytics?.revenue ?? 0,
      affiliateClicks: ep.analytics?.affiliateClicks ?? 0
    },
    category: ep.category || "Uncategorized",
    frames: ep.frames.map((frame) => ({ ...frame, imagePrompt: ensureLockedPrompt(frame.imagePrompt) })),
    videos: ep.videos.map((video) => ({ ...video, prompt: ensureLockedPrompt(video.prompt) })),
    hashtags: Array.isArray(ep.hashtags) ? ep.hashtags : [],
    checklist: ep.checklist,
    viralScore: Number(ep.viralScore || 0),
    duplicateCheck,
    parseHealth: ep.parseHealth ?? {
      score: 0,
      parsedFields: [],
      missing: [],
      status: "warning"
    },
    createdAt: ep.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as GhostEp & { allowDuplicateSave?: boolean; duplicateSimilarityThresholdOverride?: number; outputRootOverride?: string };
  const { allowDuplicateSave, duplicateSimilarityThresholdOverride, outputRootOverride, ...ep } = body;
  const history = await getEpHistory();
  if (history.some((item) => item.id === ep.id)) {
    return NextResponse.json(
      {
        error: "EP นี้ถูก Save แล้ว",
        duplicateCheck: {
          isDuplicate: true,
          similarityScore: 1,
          matchedEpId: ep.id,
          matchedTitle: ep.title
        }
      },
      { status: 409 }
    );
  }

  const duplicateCheck = await checkDuplicate(ep, duplicateSimilarityThresholdOverride);

  if (duplicateCheck.isDuplicate && !allowDuplicateSave) {
    return NextResponse.json(
      {
        error: "EP นี้ซ้ำหรือใกล้เคียงกับ EP ที่เคยมี",
        duplicateCheck
      },
      { status: 409 }
    );
  }

  const cleanEp = normalizeEp(ep, duplicateCheck);
  await appendEpToHistory(cleanEp);
  const exported = await exportEpPackage(cleanEp, outputRootOverride);
  await updateIdeaMemoryFromEp(cleanEp);
  const relativeMarkdownPath = path.relative(process.cwd(), exported.markdownPath).replace(/\\/g, "/");
  const relativeExportDir = path.relative(process.cwd(), exported.epDir).replace(/\\/g, "/");

  return NextResponse.json({
    ep: cleanEp,
    markdownPath: relativeMarkdownPath,
    exportDir: relativeExportDir
  });
}
