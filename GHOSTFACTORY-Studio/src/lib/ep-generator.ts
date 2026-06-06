import type { CharacterProfile, ContentGoal, DailyBatch, GeneratorSelection, GhostEp, IdeaMemory, ParseDebug, ParseHealth, Settings, SpokenLanguage } from "./types";
import { createChecklistFromParts } from "./checklist";

const DEBUG_PARSE = false;
const CHARACTER_LOCK =
  "Meow, fluffy orange tabby cat, orange striped fur, cute expressive face, high quality fur, Pixar-quality 3D animation";
const GLOBAL_NEGATIVE_RULES =
  "no subtitles, no caption overlay, no text overlay, no watermark, no logo, no background music by default, vertical 9:16, commercial quality visuals";

export function ensureLockedPrompt(prompt: string) {
  const clean = prompt.trim();
  if (!clean) return "";
  const hasCharacter = clean.toLowerCase().includes("meow") && clean.toLowerCase().includes("orange");
  const hasRules = clean.toLowerCase().includes("no subtitles") && clean.toLowerCase().includes("vertical 9:16");
  return `${hasCharacter ? "" : `${CHARACTER_LOCK}. `}${clean}${hasRules ? "" : `. ${GLOBAL_NEGATIVE_RULES}`}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(date: string, index: number) {
  return `EP-${date}-${String(index).padStart(3, "0")}`;
}

function defaultParseHealth(): ParseHealth {
  return {
    score: 0,
    parsedFields: [],
    missing: [],
    status: "warning"
  };
}

function generationStructure(selection?: Partial<GeneratorSelection>) {
  const setup = selection?.generationSetup;
  const videosPerEpisode = Math.max(1, Number(setup?.videosPerEpisode ?? 3));
  const automaticFrames = videosPerEpisode + 1;
  const framesPerEpisode = Math.max(2, Number(setup?.customFramesEnabled ? setup.framesPerEpisode : automaticFrames));
  const durationPerVideoSec = Math.max(1, Number(setup?.durationPerVideoSec ?? 8));
  const totalDurationSec = videosPerEpisode * durationPerVideoSec;
  return { durationPerVideoSec, framesPerEpisode, format: `${totalDurationSec}s`, totalDurationSec, videosPerEpisode };
}

function blankEp(date: string, index: number, format = "24s", category = "Uncategorized", selection?: Partial<GeneratorSelection>): GhostEp {
  const structure = generationStructure(selection);
  const normalizedFormat = selection?.generationSetup ? structure.format : format;
  const videoCount = selection?.generationSetup ? structure.videosPerEpisode : format.includes("24") ? 3 : 2;
  const frameCount = selection?.generationSetup ? structure.framesPerEpisode : videoCount + 1;
  const durationPerVideoSec = selection?.generationSetup ? structure.durationPerVideoSec : 8;
  return {
    id: makeId(date, index),
    date,
    format: normalizedFormat,
    durationSec: selection?.generationSetup ? structure.totalDurationSec : Number(normalizedFormat.match(/\d+(\.\d+)?/)?.[0] ?? videoCount * durationPerVideoSec),
    status: "idea",
    projectId: "default-project",
    characterId: selection?.character?.id ?? "meow",
    characterName: selection?.character?.name ?? "Meow",
    templateId: selection?.template?.id ?? "legacy",
    templateName: selection?.template?.name ?? "Legacy Meow",
    contentGoal: selection?.contentGoal ?? "Entertainment",
    language: selection?.language ?? "Thai",
    thumbnailImage: "",
    frameImages: {},
    promptVersions: [],
    plannedPostDate: "",
    postedDate: "",
    analytics: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      revenue: 0,
      affiliateClicks: 0
    },
    title: "",
    story: "",
    hook: "",
    category,
    frames: Array.from({ length: frameCount }, (_, frameIndex) => ({
      frameId: `F${frameIndex + 1}`,
      title: "",
      imagePrompt: ""
    })),
    videos: Array.from({ length: videoCount }, (_, videoIndex) => ({
      videoId: `V${videoIndex + 1}`,
      fromFrame: `F${videoIndex + 1}`,
      toFrame: `F${videoIndex + 2}`,
      durationSec: durationPerVideoSec,
      prompt: "",
      camera: "",
      motion: "",
      audio: "",
      dialogue: "",
      mood: ""
    })),
    voiceScript: "",
    soundEffects: "",
    caption: "",
    hashtags: [],
    checklist: createChecklistFromParts(
      Array.from({ length: frameCount }, (_, frameIndex) => ({ frameId: `F${frameIndex + 1}` })),
      Array.from({ length: videoCount }, (_, videoIndex) => ({ videoId: `V${videoIndex + 1}` }))
    ),
    viralScore: 0,
    duplicateCheck: {
      isDuplicate: false,
      similarityScore: 0
    },
    parseHealth: defaultParseHealth(),
    createdAt: new Date().toISOString()
  };
}

function categoryPlan(character?: CharacterProfile, ideaMemory?: IdeaMemory) {
  const categories = (character?.contentStyle?.length ? character.contentStyle : Object.keys(ideaMemory?.categories ?? {})).filter(Boolean);
  const fallback = ["Comedy", "Horror Comedy", "Sigma Cat", "Cat Logic", "Fake Documentary", "Random Absurd Humor"];
  const pool = categories.length ? categories : fallback;
  return [...pool].sort((a, b) => (ideaMemory?.categories?.[a] ?? 0) - (ideaMemory?.categories?.[b] ?? 0));
}

function countsFromSettings(settings?: Settings) {
  if (settings?.creditMode === "low") return { count24: 0, count16: 3 };
  if (settings?.creditMode === "high") {
    const configured = (settings.daily24sCount ?? 0) + (settings.daily16sCount ?? 0);
    if (configured >= 10) return { count24: settings.daily24sCount, count16: settings.daily16sCount };
    return { count24: 4, count16: 6 };
  }
  return {
    count24: settings?.daily24sCount ?? 3,
    count16: settings?.daily16sCount ?? 3
  };
}

export function generateDailyBatch(date = todayString(), character?: CharacterProfile, ideaMemory?: IdeaMemory, settings?: Settings, selection?: Partial<GeneratorSelection>): DailyBatch {
  const categories = categoryPlan(character, ideaMemory);
  const pick = (index: number) => categories[index % categories.length] || "Uncategorized";
  const setup = selection?.generationSetup;
  const eps = setup
    ? Array.from({ length: Math.max(1, Number(setup.totalEpisodes || 1)) }, (_, index) => blankEp(date, index + 1, `${setup.videosPerEpisode * setup.durationPerVideoSec}s`, selection?.template?.category || pick(index), selection))
    : [
        ...Array.from({ length: countsFromSettings(settings).count24 }, (_, index) => blankEp(date, index + 1, "24s", selection?.template?.category || pick(index), selection)),
        ...Array.from({ length: countsFromSettings(settings).count16 }, (_, index) => blankEp(date, index + countsFromSettings(settings).count24 + 1, "16s", selection?.template?.category || pick(index + countsFromSettings(settings).count24), selection))
      ];

  return {
    id: `BATCH-${date}`,
    date,
    eps,
    createdAt: new Date().toISOString()
  };
}

const labels = {
  title: ["EP Title", "Title", "ชื่อ EP"],
  format: ["Format", "EP Format", "รูปแบบ", "ความยาว"],
  category: ["Category", "Genre", "ประเภท", "แนว"],
  viralScore: ["Viral Score", "Score", "คะแนนไวรัล", "คะแนน"],
  story: ["Story", "Synopsis", "เนื้อเรื่อง", "เรื่องย่อ"],
  hook: ["Hook", "Opening Hook", "ฮุก", "เปิดเรื่อง"],
  language: ["Language", "Spoken Language", "Dialogue Language", "Spoken language in video"],
  voiceScript: ["Voice Script", "Voice", "บทพูด", "เสียงพูด"],
  soundEffects: ["Sound Effects", "SFX", "เสียงประกอบ"],
  caption: ["Caption", "แคปชั่น"],
  hashtags: ["Hashtags", "Hashtag", "แฮชแท็ก"],
  frameTitle: ["Title", "ชื่อ", "ชื่อภาพ"],
  imagePrompt: ["Image Prompt", "Prompt", "คำสั่งภาพ", "พรอมป์ภาพ"],
  from: ["From", "จาก"],
  to: ["To", "ถึง"],
  duration: ["Duration", "ความยาว"],
  videoPrompt: ["Video Prompt", "Prompt", "คำสั่งวิดีโอ", "พรอมป์วิดีโอ"],
  camera: ["Camera", "กล้อง"],
  motion: ["Motion", "Movement", "การเคลื่อนไหว"],
  audio: ["Audio", "เสียง"],
  dialogue: ["Dialogue", "Dialog", "บทพูดในคลิป"],
  mood: ["Mood", "Emotion", "อารมณ์"]
};

const topLevelAliases = [
  ...labels.title,
  ...labels.format,
  ...labels.category,
  ...labels.viralScore,
  ...labels.story,
  ...labels.hook,
  ...labels.voiceScript,
  ...labels.soundEffects,
  ...labels.caption,
  ...labels.hashtags,
  "Frames",
  "Frame",
  "ฉากภาพ",
  "Videos",
  "Video",
  "คลิป"
];

function cleanMarkdownLine(line: string) {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\*\s*([^*]+?)\s*:\s*\*\*\s*(.*)$/u, "$1: $2")
    .replace(/^\*\*\s*([^*]+?)\s*\*\*$/u, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function normalizeMarkdownText(raw: string) {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => cleanMarkdownLine(line))
    .join("\n");
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fieldMatch(block: string, aliases: string[], stopAliases = topLevelAliases) {
  const aliasPattern = aliases.map(escapeRegex).join("|");
  const stopPattern = stopAliases.map(escapeRegex).join("|");
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:${aliasPattern})\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:(?:${stopPattern})\\s*(?:[:：]|\\n|$)|F\\d+\\s*(?:[:：]|\\n|$)|V\\d+\\s*(?:[:：]|\\n|$)|EP\\s*\\d+\\s*(?:[:：]|\\n|$)|EP\\d+\\s*(?:[:：]|\\n|$))|$)`,
    "i"
  );
  return block.match(pattern);
}

function sectionMatch(block: string, aliases: string[]) {
  const aliasPattern = aliases.map(escapeRegex).join("|");
  const stopPattern = [...topLevelAliases.map(escapeRegex), "Frames", "Videos", "F\\d+", "V\\d+", "EP\\s*\\d+", "EP\\d+"].join("|");
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${aliasPattern})\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:${stopPattern})\\s*(?:[:：]|\\n|$)|$)`, "i");
  return block.match(pattern);
}

function fieldValue(block: string, aliases: string[], stopAliases = topLevelAliases) {
  return fieldMatch(block, aliases, stopAliases)?.[1]?.trim() ?? "";
}

function debugField(name: string, match: RegExpMatchArray | null) {
  if (DEBUG_PARSE && typeof console !== "undefined") {
    console.log(name, match);
  }
}

function debugFieldValue(name: string, block: string, aliases: string[], stopAliases = topLevelAliases) {
  const match = fieldMatch(block, aliases, stopAliases);
  debugField(name, match);
  return match?.[1]?.trim() ?? "";
}

function debugSectionValue(name: string, block: string, aliases: string[]) {
  const match = sectionMatch(block, aliases);
  debugField(name, match);
  return match?.[1]?.trim() ?? "";
}

function previousNonEmptyLine(lines: string[], index: number) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (lines[i].trim()) return lines[i].trim();
  }
  return "";
}

function splitEpBlocks(raw: string) {
  const lines = normalizeMarkdownText(raw).split("\n");
  const starts: number[] = [];
  lines.forEach((line, index) => {
    const trimmed = cleanMarkdownLine(line);
    const prev = previousNonEmptyLine(lines, index);
    const isPrimary = /^(EP\s*\d+|EP\d+|EP\s*Title|ชื่อ\s*EP)\s*[:：]?/i.test(trimmed);
    const isTopTitle =
      /^(Title|ชื่อ\s*EP)\s*[:：]/i.test(trimmed) &&
      !/^F\d+[:：]?$/i.test(prev) &&
      !/^V\d+[:：]?$/i.test(prev) &&
      !/^EP\s*\d+[:：]?$/i.test(prev);
    if (isPrimary || isTopTitle) starts.push(index);
  });

  if (!starts.length) return raw.trim() ? [raw.trim()] : [];

  return starts.map((lineStart, index) => {
    const lineEnd = starts[index + 1] ?? lines.length;
    return lines.slice(lineStart, lineEnd).join("\n").trim();
  });
}

function blockForId(block: string, id: string) {
  const stopAliases = [
    ...labels.voiceScript,
    ...labels.soundEffects,
    ...labels.caption,
    ...labels.hashtags,
    "Frames",
    "Frame",
    "ฉากภาพ",
    "Videos",
    "Video",
    "คลิป",
    "EP Title",
    "ชื่อ EP"
  ];
  const pattern = new RegExp(`(?:^|\\n)\\s*${escapeRegex(id)}\\s*(?:[:：]|\\n|$)[\\s\\S]*?(?=\\n\\s*(?:F\\d+|V\\d+|EP\\s*\\d+|EP\\d+|${stopAliases.map(escapeRegex).join("|")})\\s*(?:[:：]|\\n|$)|$)`, "i");
  return block.match(pattern)?.[0] ?? "";
}

function epHeadingTitle(block: string, fallback: string) {
  const first = block
    .split("\n")
    .map((line) => cleanMarkdownLine(line))
    .find((line) => /^(EP\s*\d+|EP\d+)/i.test(line));
  if (!first) return fallback;
  const rest = first.replace(/^(EP\s*\d+|EP\d+)\s*[-:：]?\s*/i, "").trim();
  return rest || first.replace(/\s+/g, "");
}

function topLevelBlock(block: string) {
  return block.split(/\n\s*(?:Frames|Frame|ฉากภาพ)\s*(?:[:：]|\n|$)/i)[0] ?? block;
}

function inferFormat(block: string, explicitFormat: string) {
  const text = explicitFormat.toLowerCase();
  const explicitSeconds = text.match(/\d+(\.\d+)?/);
  if (explicitSeconds) return `${explicitSeconds[0]}s`;
  if (/\bF4\s*[:：]/i.test(block) || /\bV3\s*[:：]/i.test(block)) return "24s";
  return "16s";
}

function parseHashtags(input: string) {
  return input
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function stringValue(source: Record<string, unknown>, keys: string[]) {
  const value = firstValue(source, keys);
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(" ");
  return String(value).trim();
}

function languageValue(value: string): SpokenLanguage {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("no dialogue") || normalized.includes("silent")) return "No Dialogue";
  if (normalized.includes("english")) return "English";
  if (normalized.includes("japanese")) return "Japanese";
  if (normalized.includes("korean")) return "Korean";
  if (normalized.includes("chinese")) return "Chinese";
  if (normalized.includes("thai")) return "Thai";
  return "Thai";
}

function numberValue(source: Record<string, unknown>, keys: string[]) {
  const value = firstValue(source, keys);
  if (typeof value === "number") return value;
  const match = String(value ?? "").match(/\d+(\.\d+)?/);
  return Number(match?.[0] ?? 0);
}

function arrayValue(source: Record<string, unknown>, keys: string[]) {
  const value = firstValue(source, keys);
  return Array.isArray(value) ? value : [];
}

function hashtagsValue(source: Record<string, unknown>) {
  const value = firstValue(source, ["hashtags", "hashtag", "แฮชแท็ก"]);
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  }
  return parseHashtags(String(value ?? ""));
}

function scanJsonChunks(raw: string) {
  const chunks: string[] = [];
  const text = raw.trim();
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        chunks.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return chunks;
}

function flattenJsonPayload(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed.map(asRecord).filter((item) => Object.keys(item).length);
  const record = asRecord(parsed);
  if (!Object.keys(record).length) return [];
  const eps = firstValue(record, ["eps", "episodes", "items"]);
  if (Array.isArray(eps)) return eps.map(asRecord).filter((item) => Object.keys(item).length);
  return [record];
}

function parseJsonObjects(raw: string) {
  try {
    return flattenJsonPayload(JSON.parse(raw.trim()));
  } catch {
    const objects: Record<string, unknown>[] = [];
    for (const chunk of scanJsonChunks(raw)) {
      try {
        objects.push(...flattenJsonPayload(JSON.parse(chunk)));
      } catch {
        // Ignore non-JSON fenced or malformed snippets and let text parser handle the rest.
      }
    }
    return objects;
  }
}

function inferJsonFormat(source: Record<string, unknown>, frames: unknown[], videos: unknown[]) {
  const explicit = stringValue(source, ["format", "ep_format", "length", "duration", "รูปแบบ", "ความยาว"]).toLowerCase();
  const explicitSeconds = explicit.match(/\d+(\.\d+)?/);
  if (explicitSeconds) return `${explicitSeconds[0]}s`;
  const durationSec = numberValue(source, ["durationSec", "duration_sec", "totalDurationSec", "total_duration_sec"]);
  if (durationSec) return `${durationSec}s`;
  const videoSeconds = videos.reduce<number>((sum, item) => sum + (numberValue(asRecord(item), ["durationSec", "duration_sec", "duration", "seconds"]) || 8), 0);
  if (videoSeconds) return `${videoSeconds}s`;
  if (frames.length >= 4 || videos.length >= 3) return "24s";
  return "16s";
}

function mapJsonFrame(item: unknown, index: number) {
  const frame = asRecord(item);
  const prompt = stringValue(frame, ["imagePrompt", "image_prompt", "image", "prompt", "imagePromptText", "คำสั่งภาพ", "พรอมป์ภาพ"]);
  return {
    frameId: stringValue(frame, ["frameId", "frame_id", "id", "frame"]) || `F${index + 1}`,
    title: stringValue(frame, ["title", "name", "ชื่อ", "ชื่อภาพ"]),
    imagePrompt: ensureLockedPrompt(prompt || (typeof item === "string" ? item : ""))
  };
}

function mapJsonVideo(item: unknown, index: number) {
  const video = asRecord(item);
  const prompt = stringValue(video, ["prompt", "videoPrompt", "video_prompt", "คำสั่งวิดีโอ", "พรอมป์วิดีโอ"]);
  return {
    videoId: stringValue(video, ["videoId", "video_id", "id", "video"]) || `V${index + 1}`,
    fromFrame: stringValue(video, ["fromFrame", "from_frame", "from", "จาก"]) || `F${index + 1}`,
    toFrame: stringValue(video, ["toFrame", "to_frame", "to", "ถึง"]) || `F${index + 2}`,
    durationSec: numberValue(video, ["durationSec", "duration_sec", "duration", "seconds", "ความยาว"]) || 8,
    prompt: ensureLockedPrompt(prompt || (typeof item === "string" ? item : "")),
    camera: stringValue(video, ["camera", "กล้อง"]),
    motion: stringValue(video, ["motion", "movement", "การเคลื่อนไหว"]),
    audio: stringValue(video, ["audio", "เสียง"]),
    dialogue: stringValue(video, ["dialogue", "dialog", "บทพูดในคลิป"]),
    mood: stringValue(video, ["mood", "emotion", "อารมณ์"])
  };
}

function mapJsonEp(source: Record<string, unknown>, index: number, date: string): GhostEp {
  const framesInput = arrayValue(source, ["frames", "frame_prompts", "framePrompts"]);
  const videosInput = arrayValue(source, ["videos", "video_prompts", "videoPrompts"]);
  const format = inferJsonFormat(source, framesInput, videosInput);
  const videoCount = Math.max(videosInput.length || 0, numberValue(source, ["videosPerEpisode", "videos_per_episode", "videoCount", "video_count"]) || (format.includes("24") ? 3 : 2));
  const frameCount = Math.max(framesInput.length || 0, numberValue(source, ["framesPerEpisode", "frames_per_episode", "frameCount", "frame_count"]) || videoCount + 1);
  const ep = blankEp(date, index + 1, format);

  ep.title = stringValue(source, ["title", "ep_title", "name"]);
  ep.characterId = stringValue(source, ["characterId", "character_id"]) || ep.characterId;
  ep.characterName = stringValue(source, ["characterName", "character_name"]) || ep.characterName;
  ep.templateId = stringValue(source, ["templateId", "template_id"]) || ep.templateId;
  ep.templateName = stringValue(source, ["templateName", "template_name"]) || ep.templateName;
  ep.contentGoal = (stringValue(source, ["contentGoal", "content_goal"]) || ep.contentGoal) as ContentGoal;
  ep.language = languageValue(stringValue(source, ["language", "spokenLanguage", "spoken_language", "dialogueLanguage", "dialogue_language"]) || ep.language);
  ep.thumbnailImage = stringValue(source, ["thumbnailImage", "thumbnail_image", "coverImage", "cover_image"]) || ep.thumbnailImage;
  ep.category = stringValue(source, ["category", "genre"]) || "Uncategorized";
  ep.durationSec = numberValue(source, ["durationSec", "duration_sec", "totalDurationSec", "total_duration_sec"]) || Number(format.match(/\d+(\.\d+)?/)?.[0] ?? 0);
  ep.viralScore = numberValue(source, ["viral_score", "score", "viralScore"]);
  ep.story = stringValue(source, ["story", "synopsis"]);
  ep.hook = stringValue(source, ["hook", "opening_hook", "openingHook"]);
  ep.caption = stringValue(source, ["caption"]);
  ep.hashtags = hashtagsValue(source);
  ep.voiceScript = stringValue(source, ["voice_script", "voiceScript", "voice"]);
  ep.soundEffects = stringValue(source, ["sound_effects", "soundEffects", "sfx"]);
  ep.frames = Array.from({ length: frameCount }, (_, frameIndex) => framesInput[frameIndex] !== undefined ? mapJsonFrame(framesInput[frameIndex], frameIndex) : ep.frames[frameIndex]);
  ep.videos = Array.from({ length: videoCount }, (_, videoIndex) => videosInput[videoIndex] !== undefined ? mapJsonVideo(videosInput[videoIndex], videoIndex) : ep.videos[videoIndex]);
  ep.durationSec = ep.durationSec || ep.videos.reduce((sum, video) => sum + video.durationSec, 0);
  ep.checklist = createChecklistFromParts(ep.frames, ep.videos, ep.checklist);
  ep.parseHealth = calculateParseHealth(ep);
  ep.parseDebug = buildParseDebug(ep, index);
  return ep;
}

export function calculateParseHealth(ep: GhostEp): ParseHealth {
  const missing: string[] = [];
  const parsedFields: string[] = [];
  const checks = [
    ["Title", Boolean(ep.title.trim())],
    ["Format", Boolean(String(ep.format || "").trim())],
    ["Category", Boolean(ep.category.trim())],
    ["Story", Boolean(ep.story.trim())],
    ["Hook", Boolean(ep.hook.trim())],
    ["Frames", ep.frames.length > 0 && ep.frames.every((frame) => frame.imagePrompt.trim())],
    ["Videos", ep.videos.length > 0 && ep.videos.every((video) => video.prompt.trim())],
    ["Caption", Boolean(ep.caption.trim())],
    ["Hashtags", ep.hashtags.length > 0]
  ] as const;

  checks.forEach(([label, ok]) => {
    if (ok) parsedFields.push(label);
    else missing.push(label);
  });

  const score = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return {
    score,
    parsedFields,
    missing,
    status: score >= 80 ? "ok" : "warning"
  };
}

function buildParseDebug(ep: GhostEp, index: number): ParseDebug {
  return {
    epLabel: `EP${String(index + 1).padStart(2, "0")}`,
    title: ep.title,
    format: ep.format,
    category: ep.category,
    viralScore: ep.viralScore,
    story: ep.story,
    hook: ep.hook,
    framesCount: ep.frames.filter((frame) => frame.imagePrompt.trim()).length,
    videosCount: ep.videos.filter((video) => video.prompt.trim()).length,
    parsedFields: ep.parseHealth.parsedFields,
    missingFields: ep.parseHealth.missing
  };
}

function applySelection(ep: GhostEp, selection?: Partial<GeneratorSelection>) {
  if (!selection) return ep;
  return {
    ...ep,
    characterId: ep.characterId === "meow" ? (selection.character?.id ?? ep.characterId) : ep.characterId,
    characterName: ep.characterName === "Meow" ? (selection.character?.name ?? ep.characterName) : ep.characterName,
    templateId: ep.templateId === "legacy" ? (selection.template?.id ?? ep.templateId) : ep.templateId,
    templateName: ep.templateName === "Legacy Meow" ? (selection.template?.name ?? ep.templateName) : ep.templateName,
    contentGoal: selection.contentGoal ?? ep.contentGoal,
    language: selection.language ?? ep.language
  };
}

export function parseDailyResult(raw: string, date = todayString(), selection?: Partial<GeneratorSelection>): GhostEp[] {
  const jsonObjects = parseJsonObjects(raw);
  if (jsonObjects.length) {
    return jsonObjects.map((item, index) => applySelection(mapJsonEp(item, index, date), selection));
  }

  return splitEpBlocks(raw).map((rawBlock, index) => {
    const block = normalizeMarkdownText(rawBlock);
    const topBlock = topLevelBlock(block);
    const formatText = debugFieldValue("FORMAT", topBlock, labels.format);
    const categoryText = debugFieldValue("CATEGORY", topBlock, labels.category);
    const viralScoreText = debugFieldValue("VIRAL_SCORE", topBlock, labels.viralScore);
    const storyText = debugFieldValue("STORY", topBlock, labels.story);
    const hookText = debugFieldValue("HOOK", topBlock, labels.hook);
    const languageText = debugFieldValue("LANGUAGE", topBlock, labels.language);
    const format = inferFormat(block, formatText);
    const detectedVideoIds = Array.from(block.matchAll(/\bV(\d+)\b\s*[:ï¼š]/gi)).map((match) => Number(match[1])).filter(Boolean);
    const detectedFrameIds = Array.from(block.matchAll(/\bF(\d+)\b\s*[:ï¼š]/gi)).map((match) => Number(match[1])).filter(Boolean);
    const fallbackVideoCount = format.includes("24") ? 3 : 2;
    const videoCount = Math.max(detectedVideoIds.length ? Math.max(...detectedVideoIds) : 0, fallbackVideoCount);
    const frameCount = Math.max(detectedFrameIds.length ? Math.max(...detectedFrameIds) : 0, videoCount + 1);
    const ep = blankEp(date, index + 1, format);

    ep.title = debugFieldValue("TITLE", topBlock, labels.title) || epHeadingTitle(block, `EP${String(index + 1).padStart(2, "0")}`);
    ep.category = categoryText || "Uncategorized";
    ep.viralScore = Number(viralScoreText.match(/\d+(\.\d+)?/)?.[0] ?? 0);
    ep.story = storyText;
    ep.hook = hookText;
    ep.language = languageValue(languageText || selection?.language || ep.language);
    ep.durationSec = Number(format.match(/\d+(\.\d+)?/)?.[0] ?? videoCount * 8);
    ep.voiceScript = debugFieldValue("VOICE_SCRIPT", block, labels.voiceScript) || debugSectionValue("VOICE_SCRIPT_SECTION", block, labels.voiceScript);
    ep.soundEffects = debugFieldValue("SOUND_EFFECTS", block, labels.soundEffects) || debugSectionValue("SOUND_EFFECTS_SECTION", block, labels.soundEffects);
    ep.caption = debugFieldValue("CAPTION", block, labels.caption) || debugSectionValue("CAPTION_SECTION", block, labels.caption);
    ep.hashtags = parseHashtags(debugFieldValue("HASHTAGS", block, labels.hashtags) || debugSectionValue("HASHTAGS_SECTION", block, labels.hashtags));

    ep.frames = Array.from({ length: frameCount }, (_, frameIndex) => {
      const frameId = `F${frameIndex + 1}`;
      const frameBlock = blockForId(block, frameId);
      return {
        frameId,
        title: fieldValue(frameBlock, labels.frameTitle, [...labels.frameTitle, ...labels.imagePrompt, ...topLevelAliases]) || "",
      imagePrompt: ensureLockedPrompt(fieldValue(frameBlock, labels.imagePrompt, [...labels.frameTitle, ...labels.imagePrompt, ...topLevelAliases]))
      };
    });

    ep.videos = Array.from({ length: videoCount }, (_, videoIndex) => {
      const videoId = `V${videoIndex + 1}`;
      const videoBlock = blockForId(block, videoId);
      const videoStops = [
        ...labels.from,
        ...labels.to,
        ...labels.duration,
        ...labels.videoPrompt,
        ...labels.camera,
        ...labels.motion,
        ...labels.audio,
        ...labels.dialogue,
        ...labels.mood,
        ...topLevelAliases
      ];
      return {
        videoId,
        fromFrame: fieldValue(videoBlock, labels.from, videoStops) || `F${videoIndex + 1}`,
        toFrame: fieldValue(videoBlock, labels.to, videoStops) || `F${videoIndex + 2}`,
        durationSec: Number(fieldValue(videoBlock, labels.duration, videoStops).match(/\d+(\.\d+)?/)?.[0] ?? 8),
        prompt: ensureLockedPrompt(fieldValue(videoBlock, labels.videoPrompt, videoStops)),
        camera: fieldValue(videoBlock, labels.camera, videoStops),
        motion: fieldValue(videoBlock, labels.motion, videoStops),
        audio: fieldValue(videoBlock, labels.audio, videoStops),
        dialogue: fieldValue(videoBlock, labels.dialogue, videoStops),
        mood: fieldValue(videoBlock, labels.mood, videoStops)
      };
    });

    ep.checklist = createChecklistFromParts(ep.frames, ep.videos, ep.checklist);
    ep.parseHealth = calculateParseHealth(ep);
    ep.parseDebug = buildParseDebug(ep, index);
    return applySelection(ep, selection);
  });
}
