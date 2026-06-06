import type { GhostEp, ProductionChecklist } from "./types";

const legacyFrameKeys = ["imageF1Done", "imageF2Done", "imageF3Done", "imageF4Done"] as const;
const legacyVideoKeys = ["videoV1Done", "videoV2Done", "videoV3Done"] as const;

function normalizeId(value: string, prefix: "F" | "V", index: number) {
  const clean = String(value || "").trim().toUpperCase();
  return clean || `${prefix}${index + 1}`;
}

export function createChecklistFromParts(
  frames: { frameId: string }[] = [],
  videos: { videoId: string }[] = [],
  source?: Partial<ProductionChecklist> | Record<string, unknown>
): ProductionChecklist {
  const frameMap: Record<string, boolean> = {};
  const videoMap: Record<string, boolean> = {};
  const sourceFrames = source && typeof source.frames === "object" && !Array.isArray(source.frames) ? source.frames as Record<string, unknown> : {};
  const sourceVideos = source && typeof source.videos === "object" && !Array.isArray(source.videos) ? source.videos as Record<string, unknown> : {};

  frames.forEach((frame, index) => {
    const frameId = normalizeId(frame.frameId, "F", index);
    const legacyKey = legacyFrameKeys[index];
    frameMap[frameId] = Boolean(sourceFrames[frameId] ?? (legacyKey ? source?.[legacyKey] : false));
  });

  videos.forEach((video, index) => {
    const videoId = normalizeId(video.videoId, "V", index);
    const legacyKey = legacyVideoKeys[index];
    videoMap[videoId] = Boolean(sourceVideos[videoId] ?? (legacyKey ? source?.[legacyKey] : false));
  });

  return {
    frames: frameMap,
    videos: videoMap,
    editedDone: Boolean(source?.editedDone),
    postedDone: Boolean(source?.postedDone)
  };
}

export function checklistForEp(ep: Pick<GhostEp, "frames" | "videos" | "checklist">): ProductionChecklist {
  return createChecklistFromParts(ep.frames ?? [], ep.videos ?? [], ep.checklist ?? {});
}

export function checklistCounts(checklist: ProductionChecklist) {
  const frameValues = Object.values(checklist.frames ?? {});
  const videoValues = Object.values(checklist.videos ?? {});
  return {
    framesDone: frameValues.filter(Boolean).length,
    framesTotal: frameValues.length,
    videosDone: videoValues.filter(Boolean).length,
    videosTotal: videoValues.length
  };
}

export function checklistProgress(checklist: ProductionChecklist) {
  const values = [
    ...Object.values(checklist.frames ?? {}),
    ...Object.values(checklist.videos ?? {}),
    Boolean(checklist.editedDone),
    Boolean(checklist.postedDone)
  ];
  return values.length ? Math.round((values.filter(Boolean).length / values.length) * 100) : 0;
}
