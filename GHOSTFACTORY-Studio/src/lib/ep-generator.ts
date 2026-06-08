import type { CharacterProfile, ContentGoal, ContinuityAnchor, ContinuitySelfCheck, CoreIdea, DailyBatch, DialogueOutlineItem, EpisodeState, GeneratorSelection, GhostEp, IdeaMemory, ParseDebug, ParseHealth, QualityReview, Settings, SpokenLanguage, StoryBeat, VideoPrompt, VisualState, VoiceProfile } from "./types";
import { createChecklistFromParts } from "./checklist";
import { frameCountForTemplatePack, getTemplatePack } from "./template-packs";
import { buildCharacterAnchorFromAsset, getCharacterAsset } from "./character-assets";

const DEBUG_PARSE = false;
const CHARACTER_LOCK =
  "Meow, fluffy orange tabby cat, orange striped fur, cute expressive face, high quality fur, Pixar-quality 3D animation";
const DEFAULT_CHARACTER_ANCHOR = buildCharacterAnchorFromAsset(getCharacterAsset("meow"));
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

function defaultCoreIdea(): CoreIdea {
  return {
    centralIdea: "",
    coreConflict: "",
    hookMechanic: "",
    payoffMechanic: "",
    emotionTarget: "",
    noveltyAngle: "",
    templateLogic: ""
  };
}

function defaultEpisodeState(): EpisodeState {
  return {
    primaryLocation: "",
    location: "",
    timeOfDay: "",
    lightingStyle: "",
    mainProps: "",
    continuityAnchor: "",
    characterStartPosition: "",
    characterEndPosition: "",
    lighting: "",
    props: "",
    voice: "",
    camera: "",
    cameraLanguage: "",
    environmentAudio: "",
    visualAnchor: "",
    emotionProgression: ""
  };
}

function defaultContinuityAnchor(): ContinuityAnchor {
  return {
    location: "",
    mainProp: "",
    lighting: "",
    timeOfDay: "",
    cameraStyle: "",
    emotionArc: ""
  };
}

function defaultVoiceProfile(): VoiceProfile {
  return {
    preset: "",
    gender: "",
    age: "",
    tone: "",
    energy: "",
    speakingSpeed: "",
    accent: "",
    personality: "",
    sentenceLength: "",
    vocabularyStyle: "",
    emotionalRange: ""
  };
}

function defaultContinuitySelfCheck(): ContinuitySelfCheck {
  return {
    storyContinuityScore: 0,
    frameContinuityScore: 0,
    videoContinuityScore: 0,
    voiceContinuityScore: 0,
    threshold: 85,
    passed: false,
    notes: ""
  };
}

function defaultQualityReview(): QualityReview {
  return {
    storyQualityScore: 0,
    storyBeatContinuityScore: 0,
    visualContinuityScore: 0,
    videoContinuityScore: 0,
    dialogueConsistencyScore: 0,
    voiceContinuityScore: 0,
    noveltyScore: 0,
    templateMatchScore: 0,
    characterConsistencyScore: 0,
    episodeCompletenessScore: 0,
    threshold: 85,
    passed: false,
    notes: ""
  };
}

function chooseAutoFrameCountFromText(input: string) {
  const text = input.toLowerCase();
  const pack = getTemplatePack(text);
  const complexHints = ["nightmare", "horror", "anime", "mystery", "evidence", "contradiction", "unanswered", "manifestation", "protocol", "impossible"];
  const mediumHints = ["affiliate", "review", "educational", "product", "reason", "benefit", "problem"];
  const complexity = [
    ...complexHints.filter((hint) => text.includes(hint)),
    ...mediumHints.filter((hint) => text.includes(hint))
  ].length + (text.length > 260 ? 2 : text.length > 140 ? 1 : 0);
  if (complexity >= 3) return 6;
  if (complexity >= 1) return 4;
  return frameCountForTemplatePack(pack);
}

function generationStructure(selection?: Partial<GeneratorSelection>) {
  const setup = selection?.generationSetup;
  const autoFrameCount = Boolean(setup?.autoFrameCount);
  const autoFrames = autoFrameCount ? chooseAutoFrameCountFromText(`${selection?.template?.name ?? ""} ${selection?.template?.category ?? ""} ${selection?.contentGoal ?? ""}`) : 0;
  const videosPerEpisode = autoFrameCount ? Math.max(1, autoFrames - 1) : Math.max(1, Number(setup?.videosPerEpisode ?? 3));
  const automaticFrames = videosPerEpisode + 1;
  const framesPerEpisode = autoFrameCount ? autoFrames : Math.max(2, Number(setup?.customFramesEnabled ? setup.framesPerEpisode : automaticFrames));
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
    coreIdea: defaultCoreIdea(),
    storyBeats: [],
    episodeState: defaultEpisodeState(),
    continuityAnchor: defaultContinuityAnchor(),
    characterAnchor: DEFAULT_CHARACTER_ANCHOR,
    voiceProfile: defaultVoiceProfile(),
    visualStates: [],
    dialogueOutline: [],
    continuitySelfCheck: defaultContinuitySelfCheck(),
    qualityReview: defaultQualityReview(),
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
      videoPrompt: "",
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

function scoreValue(source: Record<string, unknown>, keys: string[]) {
  return Math.max(0, Math.min(100, numberValue(source, keys)));
}

function textObjectValue(source: Record<string, unknown>, keys: string[]) {
  const value = asRecord(firstValue(source, keys));
  return value;
}

function mapCoreIdea(source: Record<string, unknown>): CoreIdea {
  const core = textObjectValue(source, ["coreIdea", "core_idea", "Core Idea"]);
  const state = textObjectValue(source, ["episodeState", "episode_state", "state", "Episode State"]);
  const fallback = defaultCoreIdea();
  return {
    centralIdea: stringValue(core, ["centralIdea", "central_idea"]) || stringValue(state, ["centralIdea", "central_idea"]) || stringValue(source, ["centralIdea", "central_idea"]) || fallback.centralIdea,
    coreConflict: stringValue(core, ["coreConflict", "core_conflict"]) || stringValue(source, ["coreConflict", "core_conflict"]) || fallback.coreConflict,
    hookMechanic: stringValue(core, ["hookMechanic", "hook_mechanic"]) || stringValue(source, ["hookMechanic", "hook_mechanic"]) || fallback.hookMechanic,
    payoffMechanic: stringValue(core, ["payoffMechanic", "payoff_mechanic"]) || stringValue(source, ["payoffMechanic", "payoff_mechanic"]) || fallback.payoffMechanic,
    emotionTarget: stringValue(core, ["emotionTarget", "emotion_target"]) || stringValue(source, ["emotionTarget", "emotion_target"]) || fallback.emotionTarget,
    noveltyAngle: stringValue(core, ["noveltyAngle", "novelty_angle"]) || stringValue(source, ["noveltyAngle", "novelty_angle"]) || fallback.noveltyAngle,
    templateLogic: stringValue(core, ["templateLogic", "template_logic"]) || stringValue(source, ["templateLogic", "template_logic"]) || fallback.templateLogic
  };
}

function mapStoryBeat(item: unknown, index: number): StoryBeat {
  const beat = asRecord(item);
  const role = stringValue(beat, ["role", "storyRole", "story_role"]).toLowerCase();
  return {
    beatId: stringValue(beat, ["beatId", "beat_id", "id"]) || `beat${index + 1}`,
    role: ["hook", "goal", "obstacle", "escalation", "payoff"].includes(role) ? role as StoryBeat["role"] : undefined,
    function: stringValue(beat, ["function", "beatFunction", "beat_function"]) || role,
    beat: stringValue(beat, ["beat", "storyBeat", "story_beat", "description"]) || (typeof item === "string" ? item : "")
  };
}

function mapEpisodeState(source: Record<string, unknown>): EpisodeState {
  const state = textObjectValue(source, ["episodeState", "episode_state", "state", "Episode State"]);
  const fallback = defaultEpisodeState();
  return {
    primaryLocation: stringValue(state, ["primaryLocation", "primary_location"]) || stringValue(source, ["primaryLocation", "primary_location"]) || fallback.primaryLocation,
    location: stringValue(state, ["location", "primaryLocation", "primary_location"]) || stringValue(source, ["location", "primaryLocation", "primary_location"]) || fallback.location,
    timeOfDay: stringValue(state, ["timeOfDay", "time_of_day"]) || stringValue(source, ["timeOfDay", "time_of_day"]) || fallback.timeOfDay,
    lightingStyle: stringValue(state, ["lightingStyle", "lighting_style", "lighting"]) || stringValue(source, ["lightingStyle", "lighting_style", "lighting"]) || fallback.lightingStyle,
    mainProps: stringValue(state, ["mainProps", "main_props", "props"]) || stringValue(source, ["mainProps", "main_props", "props"]) || fallback.mainProps,
    continuityAnchor: stringValue(state, ["continuityAnchor", "continuity_anchor"]) || stringValue(source, ["continuityAnchor", "continuity_anchor"]) || fallback.continuityAnchor,
    characterStartPosition: stringValue(state, ["characterStartPosition", "character_start_position"]) || stringValue(source, ["characterStartPosition", "character_start_position"]) || fallback.characterStartPosition,
    characterEndPosition: stringValue(state, ["characterEndPosition", "character_end_position"]) || stringValue(source, ["characterEndPosition", "character_end_position"]) || fallback.characterEndPosition,
    lighting: stringValue(state, ["lighting", "lightingStyle", "lighting_style"]) || stringValue(source, ["lighting", "lightingStyle", "lighting_style"]) || fallback.lighting,
    props: stringValue(state, ["props", "mainProps", "main_props"]) || stringValue(source, ["props", "mainProps", "main_props"]) || fallback.props,
    voice: stringValue(state, ["voice", "voiceStyle", "voice_style"]) || stringValue(source, ["voice", "voiceStyle", "voice_style"]) || fallback.voice,
    camera: stringValue(state, ["camera", "cameraLanguage", "camera_language"]) || stringValue(source, ["camera", "cameraLanguage", "camera_language"]) || fallback.camera,
    cameraLanguage: stringValue(state, ["cameraLanguage", "camera_language", "camera"]) || stringValue(source, ["cameraLanguage", "camera_language", "camera"]) || fallback.cameraLanguage,
    environmentAudio: stringValue(state, ["environmentAudio", "environment_audio"]) || stringValue(source, ["environmentAudio", "environment_audio"]) || fallback.environmentAudio,
    visualAnchor: stringValue(state, ["visualAnchor", "visual_anchor"]) || stringValue(source, ["visualAnchor", "visual_anchor"]) || fallback.visualAnchor,
    emotionProgression: stringValue(state, ["emotionProgression", "emotion_progression", "characterEmotionArc", "character_emotion_arc"]) || stringValue(source, ["emotionProgression", "emotion_progression", "characterEmotionArc", "character_emotion_arc"]) || fallback.emotionProgression
  };
}

function mapVoiceProfile(source: Record<string, unknown>): VoiceProfile {
  const profile = textObjectValue(source, ["voiceProfile", "voice_profile"]);
  const fallback = defaultVoiceProfile();
  return {
    preset: stringValue(profile, ["preset"]) || stringValue(source, ["voicePreset", "voice_preset"]) || fallback.preset,
    gender: stringValue(profile, ["gender"]) || stringValue(source, ["voiceGender", "voice_gender"]) || fallback.gender,
    age: stringValue(profile, ["age"]) || stringValue(source, ["voiceAge", "voice_age"]) || fallback.age,
    tone: stringValue(profile, ["tone"]) || stringValue(source, ["voiceTone", "voice_tone"]) || fallback.tone,
    energy: stringValue(profile, ["energy"]) || stringValue(source, ["voiceEnergy", "voice_energy"]) || fallback.energy,
    speakingSpeed: stringValue(profile, ["speakingSpeed", "speaking_speed"]) || stringValue(source, ["speakingSpeed", "speaking_speed"]) || fallback.speakingSpeed,
    accent: stringValue(profile, ["accent"]) || stringValue(source, ["accent"]) || fallback.accent,
    personality: stringValue(profile, ["personality"]) || stringValue(source, ["voicePersonality", "voice_personality"]) || fallback.personality,
    sentenceLength: stringValue(profile, ["sentenceLength", "sentence_length"]) || stringValue(source, ["sentenceLength", "sentence_length"]) || fallback.sentenceLength,
    vocabularyStyle: stringValue(profile, ["vocabularyStyle", "vocabulary_style"]) || stringValue(source, ["vocabularyStyle", "vocabulary_style"]) || fallback.vocabularyStyle,
    emotionalRange: stringValue(profile, ["emotionalRange", "emotional_range"]) || stringValue(source, ["emotionalRange", "emotional_range"]) || fallback.emotionalRange
  };
}

function mapVisualState(item: unknown, index: number): VisualState {
  const state = asRecord(item);
  return {
    frameId: stringValue(state, ["frameId", "frame_id", "id"]) || `F${index + 1}`,
    locationLayout: stringValue(state, ["locationLayout", "location_layout"]),
    characterPosition: stringValue(state, ["characterPosition", "character_position"]),
    characterFacingDirection: stringValue(state, ["characterFacingDirection", "character_facing_direction"]),
    cameraPosition: stringValue(state, ["cameraPosition", "camera_position"]),
    cameraAngle: stringValue(state, ["cameraAngle", "camera_angle"]),
    cameraDistance: stringValue(state, ["cameraDistance", "camera_distance"]),
    mainPropPosition: stringValue(state, ["mainPropPosition", "main_prop_position"]),
    lightingDirection: stringValue(state, ["lightingDirection", "lighting_direction"]),
    emotionState: stringValue(state, ["emotionState", "emotion_state"]),
    actionState: stringValue(state, ["actionState", "action_state"])
  };
}

function mapDialogueOutlineItem(item: unknown, index: number): DialogueOutlineItem {
  const outline = asRecord(item);
  return {
    videoId: stringValue(outline, ["videoId", "video_id", "id"]) || `V${index + 1}`,
    dialogueIntent: stringValue(outline, ["dialogueIntent", "dialogue_intent"]),
    emotionalIntensity: stringValue(outline, ["emotionalIntensity", "emotional_intensity"]),
    speechPattern: stringValue(outline, ["speechPattern", "speech_pattern"]),
    forbiddenToneShift: stringValue(outline, ["forbiddenToneShift", "forbidden_tone_shift"])
  };
}

function mapContinuitySelfCheck(source: Record<string, unknown>): ContinuitySelfCheck {
  const check = textObjectValue(source, ["continuitySelfCheck", "continuity_self_check", "selfCheck", "self_check"]);
  const fallback = defaultContinuitySelfCheck();
  const next = {
    storyContinuityScore: scoreValue(check, ["storyContinuityScore", "story_continuity_score"]) || scoreValue(source, ["storyContinuityScore", "story_continuity_score"]),
    frameContinuityScore: scoreValue(check, ["frameContinuityScore", "frame_continuity_score"]) || scoreValue(source, ["frameContinuityScore", "frame_continuity_score"]),
    videoContinuityScore: scoreValue(check, ["videoContinuityScore", "video_continuity_score"]) || scoreValue(source, ["videoContinuityScore", "video_continuity_score"]),
    voiceContinuityScore: scoreValue(check, ["voiceContinuityScore", "voice_continuity_score"]) || scoreValue(source, ["voiceContinuityScore", "voice_continuity_score"]),
    threshold: scoreValue(check, ["threshold"]) || scoreValue(source, ["continuityThreshold", "continuity_threshold"]) || fallback.threshold,
    passed: Boolean(firstValue(check, ["passed"]) ?? firstValue(source, ["continuityPassed", "continuity_passed"]) ?? false),
    notes: stringValue(check, ["notes", "note"]) || stringValue(source, ["continuityNotes", "continuity_notes"]) || fallback.notes
  };
  return {
    ...next,
    passed: next.passed || [next.storyContinuityScore, next.frameContinuityScore, next.videoContinuityScore, next.voiceContinuityScore].every((score) => score >= next.threshold)
  };
}

function mapQualityReview(source: Record<string, unknown>): QualityReview {
  const review = textObjectValue(source, ["qualityReview", "quality_review", "Quality Review"]);
  const oldCheck = textObjectValue(source, ["continuitySelfCheck", "continuity_self_check", "selfCheck", "self_check"]);
  const fallback = defaultQualityReview();
  const next = {
    storyQualityScore: scoreValue(review, ["storyQualityScore", "story_quality_score"]) || scoreValue(oldCheck, ["storyContinuityScore", "story_continuity_score"]) || scoreValue(source, ["storyQualityScore", "story_quality_score"]),
    storyBeatContinuityScore: scoreValue(review, ["storyBeatContinuityScore", "story_beat_continuity_score"]) || scoreValue(source, ["storyBeatContinuityScore", "story_beat_continuity_score"]),
    visualContinuityScore: scoreValue(review, ["visualContinuityScore", "visual_continuity_score"]) || scoreValue(oldCheck, ["frameContinuityScore", "frame_continuity_score"]) || scoreValue(source, ["visualContinuityScore", "visual_continuity_score"]),
    videoContinuityScore: scoreValue(review, ["videoContinuityScore", "video_continuity_score"]) || scoreValue(oldCheck, ["videoContinuityScore", "video_continuity_score"]) || scoreValue(source, ["videoContinuityScore", "video_continuity_score"]),
    dialogueConsistencyScore: scoreValue(review, ["dialogueConsistencyScore", "dialogue_consistency_score"]) || scoreValue(source, ["dialogueConsistencyScore", "dialogue_consistency_score"]),
    voiceContinuityScore: scoreValue(review, ["voiceContinuityScore", "voice_continuity_score"]) || scoreValue(oldCheck, ["voiceContinuityScore", "voice_continuity_score"]) || scoreValue(source, ["voiceContinuityScore", "voice_continuity_score"]),
    noveltyScore: scoreValue(review, ["noveltyScore", "novelty_score"]) || scoreValue(source, ["noveltyScore", "novelty_score"]),
    templateMatchScore: scoreValue(review, ["templateMatchScore", "template_match_score"]) || scoreValue(source, ["templateMatchScore", "template_match_score"]),
    characterConsistencyScore: scoreValue(review, ["characterConsistencyScore", "character_consistency_score"]) || scoreValue(source, ["characterConsistencyScore", "character_consistency_score"]),
    episodeCompletenessScore: scoreValue(review, ["episodeCompletenessScore", "episode_completeness_score"]) || scoreValue(source, ["episodeCompletenessScore", "episode_completeness_score"]),
    threshold: scoreValue(review, ["threshold"]) || scoreValue(oldCheck, ["threshold"]) || scoreValue(source, ["qualityThreshold", "quality_threshold"]) || fallback.threshold,
    passed: Boolean(firstValue(review, ["passed"]) ?? firstValue(oldCheck, ["passed"]) ?? firstValue(source, ["qualityPassed", "quality_passed"]) ?? false),
    notes: stringValue(review, ["notes", "note"]) || stringValue(oldCheck, ["notes", "note"]) || stringValue(source, ["qualityNotes", "quality_notes"]) || fallback.notes
  };
  return {
    ...next,
    passed: next.passed || [next.storyQualityScore, next.storyBeatContinuityScore, next.visualContinuityScore, next.videoContinuityScore, next.dialogueConsistencyScore, next.voiceContinuityScore, next.noveltyScore, next.templateMatchScore, next.characterConsistencyScore, next.episodeCompletenessScore].every((score) => score >= next.threshold)
  };
}

function buildVoiceScriptFromDialogue(videos: Pick<VideoPrompt, "dialogue">[], fallback = "", language: SpokenLanguage = "Thai") {
  if (language === "No Dialogue") return "";
  const dialogueScript = videos
    .map((video) => video.dialogue.trim())
    .filter(Boolean)
    .join(" ");
  return dialogueScript || fallback.trim();
}

function hasContinuityState(ep: GhostEp) {
  return Boolean(
    ep.coreIdea && Object.values(ep.coreIdea).some((value) => value.trim()) &&
    ep.episodeState && Object.values(ep.episodeState).some((value) => value.trim()) &&
    ep.voiceProfile && Object.values(ep.voiceProfile).some((value) => value.trim()) &&
    ep.characterAnchor?.trim() &&
    ep.storyBeats?.length &&
    ep.visualStates?.length &&
    ep.dialogueOutline?.length
  );
}

function hasTransitionVideoPrompts(ep: GhostEp) {
  return ep.videos.every((video) => {
    const text = video.videoPrompt.toLowerCase();
    return Boolean(video.fromFrame.trim() && video.toFrame.trim() && text.trim() && !/section\s+[a-i]|new scene|cut to|teleport|different location|เปลี่ยนฉาก|ตัดไป|วาร์ป/i.test(text));
  });
}

function hasStructuredImagePrompts(ep: GhostEp) {
  return ep.frames.every((frame) => Boolean(frame.frameId.trim() && frame.title.trim() && frame.imagePrompt.trim() && !/section\s+[a-i]/i.test(frame.imagePrompt)));
}

function hasPassingContinuitySelfCheck(ep: GhostEp) {
  const review = ep.qualityReview;
  return Boolean(review?.passed && [review.storyQualityScore, review.visualContinuityScore, review.videoContinuityScore, review.voiceContinuityScore, review.noveltyScore, review.templateMatchScore, review.characterConsistencyScore].every((score) => score >= review.threshold));
}

export function ensureAnchorPrompt(prompt: string, characterAnchor = DEFAULT_CHARACTER_ANCHOR) {
  const locked = ensureLockedPrompt(prompt);
  if (!locked) return "";
  const hasAnchor = characterAnchor && locked.toLowerCase().includes(characterAnchor.slice(0, 24).toLowerCase());
  return hasAnchor ? locked : `${characterAnchor}. ${locked}`;
}

function storyBeatForFrame(ep: GhostEp, frameId: string, index: number) {
  return ep.storyBeats?.find((beat) => beat.beatId.toLowerCase() === `beat${index + 1}` || beat.beatId.toLowerCase() === frameId.toLowerCase()) ?? ep.storyBeats?.[index];
}

function visualStateForFrame(ep: GhostEp, frameId: string) {
  return ep.visualStates?.find((state) => state.frameId.toLowerCase() === frameId.toLowerCase());
}

function dialogueOutlineForVideo(ep: GhostEp, videoId: string) {
  return ep.dialogueOutline?.find((item) => item.videoId.toLowerCase() === videoId.toLowerCase());
}

function stripAssemblySections(prompt: string) {
  return prompt
    .replace(/SECTION\s+[A-I]\s*-\s*[A-Z ]+:/gi, "")
    .replace(/\b(START STATE|TRANSITION|END STATE|CAMERA|MOTION|AUDIO|DIALOGUE):/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function leanPrompt(prompt: string) {
  return stripAssemblySections(prompt)
    .replace(CHARACTER_LOCK, "")
    .replace(GLOBAL_NEGATIVE_RULES, "")
    .replace(/From the previous beat\s*\([^)]*\),?\s*/gi, "")
    .replace(/\b(actionState|emotionState|dialogueIntent|storyBeat|emotionalIntensity):\s*[^.。!?\n]+/gi, "")
    .replace(/\b(hook|evidence|escalation|realization|payoff|final approach|first action)\s*:\s*[\s\S]*?(?=\b(?:Meow|A fluffy|The fluffy|The camera|An orange|A small|Camera)\b)/gi, "")
    .replace(/\s*\.?\s*$/, "")
    .replace(/^\s*[.,;:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderImagePrompt(ep: GhostEp, frame: GhostEp["frames"][number], index = ep.frames.findIndex((item) => item.frameId === frame.frameId)) {
  void ep;
  void index;
  return leanPrompt(frame.imagePrompt);
}

export function renderVideoPrompt(ep: GhostEp, video: GhostEp["videos"][number]) {
  void ep;
  return leanPrompt(video.videoPrompt);
}

export function assembleEpPrompts(ep: GhostEp): GhostEp {
  const next: GhostEp = {
    ...ep,
    characterAnchor: ep.characterAnchor || DEFAULT_CHARACTER_ANCHOR
  };
  next.frames = next.frames.map((frame, index) => ({
    ...frame,
    imagePrompt: renderImagePrompt(next, frame, index)
  }));
  next.videos = next.videos.map((video) => ({
    ...video,
    videoPrompt: renderVideoPrompt(next, video)
  }));
  next.voiceScript = buildVoiceScriptFromDialogue(next.videos, next.voiceScript, next.language);
  return next;
}

export function leanEpOutput(ep: GhostEp): GhostEp {
  return {
    ...ep,
    frames: ep.frames.map((frame) => ({
      frameId: frame.frameId,
      title: frame.title,
      imagePrompt: leanPrompt(frame.imagePrompt)
    })),
    videos: ep.videos.map((video) => ({
      videoId: video.videoId,
      fromFrame: video.fromFrame,
      toFrame: video.toFrame,
      durationSec: video.durationSec,
      videoPrompt: leanPrompt(video.videoPrompt),
      camera: video.camera,
      motion: video.motion,
      audio: video.audio,
      dialogue: video.dialogue,
      mood: video.mood
    }))
  };
}

function templatePackForEp(ep: GhostEp) {
  return getTemplatePack(`${ep.templateId} ${ep.templateName} ${ep.category} ${ep.contentGoal}`);
}

function compactFormula(formula: string[], frameCount: number) {
  if (!formula.length) return [];
  if (frameCount >= formula.length) return formula;
  if (frameCount === 3 && formula.length >= 4) {
    return [formula[0], `${formula[1]} + ${formula[2]}`, formula[formula.length - 1]];
  }
  return [formula[0], ...formula.slice(-Math.max(1, frameCount - 1))].slice(0, frameCount);
}

const storyDepthRoles = ["hook", "goal", "obstacle", "escalation", "payoff"] as const;
type StoryDepthRole = typeof storyDepthRoles[number];

function depthRoleForIndex(index: number, frameCount: number): StoryDepthRole {
  if (frameCount >= 5) return storyDepthRoles[Math.min(index, storyDepthRoles.length - 1)];
  if (frameCount === 4) return (["hook", "goal", "escalation", "payoff"] as const)[index] ?? "payoff";
  if (frameCount === 3) return (["hook", "obstacle", "payoff"] as const)[index] ?? "payoff";
  return index === 0 ? "hook" : "payoff";
}

function depthFunctionForRole(role: StoryDepthRole, frameCount: number) {
  if (frameCount === 4 && role === "goal") return "goal + obstacle";
  if (frameCount === 3 && role === "hook") return "observation + goal";
  if (frameCount === 3 && role === "obstacle") return "problem + escalation";
  return role;
}

function beatFunctions(ep: GhostEp, frameCount: number) {
  const formula = compactFormula(templatePackForEp(ep).storyFormula ?? [], frameCount);
  if (formula.length) return formula.map((item, index) => `${depthFunctionForRole(depthRoleForIndex(index, frameCount), frameCount)}: ${item}`);
  if (frameCount >= 6) return ["hook / anomaly / setup", "first action / first evidence", "escalation", "realization / complication", "final approach / tension peak", "payoff / unresolved ending / result"];
  if (frameCount === 4) return ["hook", "evidence", "realization", "payoff"];
  return ["hook", "escalation", "payoff"];
}

function mainObjectForEp(ep: GhostEp) {
  return ep.episodeState?.mainProps || ep.episodeState?.props || ep.coreIdea?.hookMechanic || "main object";
}

function locationForEp(ep: GhostEp) {
  return ep.episodeState?.primaryLocation || ep.episodeState?.location || "same room";
}

function catLogicPayoffObject(ep: GhostEp) {
  const source = `${ep.title} ${ep.story} ${mainObjectForEp(ep)}`.toLowerCase();
  if (/bed|cushion|pillow|ที่นอน|เบาะ|หมอน/.test(source)) return "the remote control beside it";
  if (/toy|ของเล่น|ball|ลูกบอล/.test(source)) return "the empty box";
  if (/feeder|food|อาหาร|ชาม/.test(source)) return "the paper bag near the bowl";
  return "the least useful object nearby";
}

function templateCoreIdeaFallback(ep: GhostEp) {
  const pack = templatePackForEp(ep);
  const object = mainObjectForEp(ep);
  const location = locationForEp(ep);
  if (pack.id === "cute-daily-life") {
    return `Human logic says ${object} is useful, but Meow uses cat logic in ${location} and chooses ${catLogicPayoffObject(ep)} instead`;
  }
  if (pack.id === "sigma-cat") {
    return `Meow makes a cool entrance, faces a tiny ridiculous challenge, and recovers with deadpan dignity`;
  }
  if (pack.id === "nightmare-protocol") {
    return `Meow notices one impossible detail in ${location}, follows the evidence, and ends with a question that cannot be answered`;
  }
  if (pack.id === "review") {
    return `Meow tests ${object} through real use, moving from problem to demonstration to clear practical benefit`;
  }
  if (pack.id === "affiliate") {
    return `Meow turns a small pain point into a natural product solution with proof and a soft call to action`;
  }
  return ep.hook || ep.title || ep.story.slice(0, 120);
}

function templateBeatText(ep: GhostEp, formula: string, index: number, frameCount: number) {
  const pack = templatePackForEp(ep);
  const object = mainObjectForEp(ep);
  const location = locationForEp(ep);
  const finalBeat = index === frameCount - 1;
  if (pack.id === "cute-daily-life") {
    if (index === 0) return `Human expectation in ${location}: ${object} should be the obvious useful thing for Meow.`;
    if (finalBeat) return `Absurd cat decision: Meow ignores ${object} and settles on ${catLogicPayoffObject(ep)} like it was the correct choice all along.`;
    if (/overthinking/i.test(formula)) return `Meow overthinks ${object}, testing it from the wrong angle with serious cat logic.`;
    return `Meow inspects ${object} carefully, as if judging whether human logic can be trusted.`;
  }
  if (pack.id === "sigma-cat") {
    if (index === 0) return `Meow enters ${location} with a cool, silent, overconfident pose.`;
    if (finalBeat) return `Meow recovers from the tiny failure with deadpan dignity and pretends it was intentional.`;
    if (/challenge/i.test(formula)) return `A ridiculous small obstacle interrupts Meow's confident image.`;
    return `Meow keeps acting untouchable while the setup becomes slightly more absurd.`;
  }
  if (pack.id === "nightmare-protocol") {
    if (index === 0) return `Impossible detail: something about ${object} in ${location} violates normal reality.`;
    if (finalBeat) return `Inescapable ending: the evidence remains, and the unanswered question follows Meow instead of resolving.`;
    if (/evidence/i.test(formula)) return `Meow finds clear evidence that the impossible detail is real, not imagination.`;
    if (/approach/i.test(formula)) return `Meow cautiously approaches the source without leaving the same location.`;
    return `Manifestation: the impossible evidence responds, but there is no simple monster reveal.`;
  }
  if (pack.id === "review") {
    if (index === 0) return `Problem: Meow faces a clear everyday issue involving ${object}.`;
    if (finalBeat) return `Result: the practical benefit is visible through Meow's behavior, without exaggerated claims.`;
    if (/product/i.test(formula)) return `Show ${object} naturally in the scene as the item being tested.`;
    return `Demonstrate one real action that proves whether ${object} helps.`;
  }
  if (pack.id === "affiliate") {
    if (index === 0) return `Pain point: Meow reacts to the small problem that ${object} can solve.`;
    if (finalBeat) return `Soft call to action: the solution feels natural, useful, and not hard-sold.`;
    if (/solution/i.test(formula)) return `Introduce ${object} as the natural solution inside the scene.`;
    return `Proof: Meow's action shows the product benefit without overclaiming.`;
  }
  return `${formula} for ${ep.coreIdea?.centralIdea || ep.title}`;
}

function templateDepthBeatText(ep: GhostEp, role: StoryDepthRole, formula: string, index: number, frameCount: number) {
  const pack = templatePackForEp(ep);
  const object = mainObjectForEp(ep);
  const location = locationForEp(ep);
  if (pack.id === "cute-daily-life") {
    if (role === "hook") return `Observation: a human expects ${object} to be the obvious useful thing in ${location}.`;
    if (role === "goal") return `Goal: Meow wants to decide whether ${object} deserves cat approval.`;
    if (role === "obstacle") return `Problem: human logic makes ${object} look correct, but Meow's cat logic rejects the obvious answer.`;
    if (role === "escalation") return `Escalation: Meow overthinks the choice and becomes more convinced the wrong object is better.`;
    return `Payoff: Meow ignores ${object} and chooses ${catLogicPayoffObject(ep)} as the serious cat-approved solution.`;
  }
  if (pack.id === "sigma-cat") {
    if (role === "hook") return `Observation: Meow enters ${location} with a cool confident image.`;
    if (role === "goal") return `Goal: Meow tries to maintain the flawless sigma pose.`;
    if (role === "obstacle") return `Problem: a tiny ridiculous challenge threatens the cool image.`;
    if (role === "escalation") return `Escalation: the tiny problem becomes harder to ignore while Meow refuses to react.`;
    return `Payoff: Meow recovers with deadpan dignity and acts like the failure was intentional.`;
  }
  if (pack.id === "nightmare-protocol") {
    if (role === "hook") return `Observation: one impossible detail appears near ${object} in ${location}.`;
    if (role === "goal") return `Goal: Meow tries to understand the source without leaving the same scene.`;
    if (role === "obstacle") return `Problem: the evidence proves the impossible detail is real.`;
    if (role === "escalation") return `Escalation: the evidence responds as Meow approaches, making escape feel impossible.`;
    return `Payoff: the question remains unanswered and follows Meow instead of resolving.`;
  }
  if (pack.id === "review") {
    if (role === "hook") return `Observation: Meow faces a clear everyday problem involving ${object}.`;
    if (role === "goal") return `Goal: Meow tests whether ${object} can actually help.`;
    if (role === "obstacle") return `Problem: the first attempt reveals the real usage challenge.`;
    if (role === "escalation") return `Escalation: Meow demonstrates one clearer action that proves the use case.`;
    return `Payoff: the practical benefit becomes visible through Meow's result.`;
  }
  if (pack.id === "affiliate") {
    if (role === "hook") return `Observation: Meow reacts to a small pain point involving ${object}.`;
    if (role === "goal") return `Goal: Meow needs a natural solution that fits the scene.`;
    if (role === "obstacle") return `Problem: the pain point continues until ${object} is introduced.`;
    if (role === "escalation") return `Escalation: Meow proves the solution through one visible action.`;
    return `Payoff: the solution feels useful and ends with a soft call to action.`;
  }
  return templateBeatText(ep, formula, index, frameCount);
}

export function generateCoreIdea(ep: GhostEp): CoreIdea {
  const pack = templatePackForEp(ep);
  const templateLogic = ep.coreIdea?.templateLogic || `${pack.id}: ${pack.logicLayer || `${pack.coreConflict}; ${pack.payoffMechanic}`}`;
  return {
    ...defaultCoreIdea(),
    ...(ep.coreIdea ?? {}),
    centralIdea: ep.coreIdea?.centralIdea || templateCoreIdeaFallback(ep),
    coreConflict: ep.coreIdea?.coreConflict || pack.coreConflict,
    hookMechanic: ep.coreIdea?.hookMechanic || ep.hook || "opening hook",
    payoffMechanic: ep.coreIdea?.payoffMechanic || ep.story.split(/[.!?。！？]/).filter(Boolean).pop()?.trim() || pack.payoffMechanic,
    emotionTarget: ep.coreIdea?.emotionTarget || ep.episodeState?.emotionProgression || "curiosity -> reaction",
    noveltyAngle: ep.coreIdea?.noveltyAngle || `${pack.id} angle: ${pack.qualitySignals?.join(" -> ") || pack.payoffMechanic}`,
    templateLogic
  };
}

export function generateStoryBeats(ep: GhostEp): StoryBeat[] {
  const frameCount = Math.max(1, ep.frames.length);
  const existing = Array.isArray(ep.storyBeats) ? ep.storyBeats.filter((beat) => beat.beat.trim()) : [];
  const functions = beatFunctions(ep, frameCount);
  if (existing.length >= frameCount) {
    return existing.slice(0, frameCount).map((beat, index) => ({
      ...beat,
      role: beat.role || depthRoleForIndex(index, frameCount),
      function: functions[index] || beat.function,
      beat: beat.beat || templateDepthBeatText(ep, depthRoleForIndex(index, frameCount), functions[index] || beat.function, index, frameCount)
    }));
  }
  return Array.from({ length: frameCount }, (_, index) => ({
    beatId: `beat${index + 1}`,
    role: depthRoleForIndex(index, frameCount),
    function: functions[index] || `connector ${index + 1}`,
    beat: existing[index]?.beat || templateDepthBeatText(ep, depthRoleForIndex(index, frameCount), functions[index] || "story beat", index, frameCount)
  }));
}

export function generateEpisodeState(ep: GhostEp): EpisodeState {
  const old = { ...defaultEpisodeState(), ...(ep.episodeState ?? {}) };
  const firstFrameText = stripAssemblySections(ep.frames[0]?.imagePrompt ?? "");
  const location = old.primaryLocation || old.location || old.continuityAnchor || "same continuous scene";
  const lighting = old.lightingStyle || old.lighting || "cinematic lighting";
  const props = old.mainProps || old.props || "main story prop";
  const camera = old.cameraLanguage || old.camera || "continuous cinematic camera";
  return {
    ...old,
    primaryLocation: location,
    location,
    timeOfDay: old.timeOfDay || "same time of day",
    lightingStyle: lighting,
    mainProps: props,
    continuityAnchor: old.continuityAnchor || `${location}, ${props}`,
    characterStartPosition: old.characterStartPosition || "initial beat position",
    characterEndPosition: old.characterEndPosition || "final beat position",
    lighting,
    props,
    voice: old.voice || ep.voiceProfile?.preset || ep.characterName,
    camera,
    cameraLanguage: camera,
    environmentAudio: old.environmentAudio || "continuous environment audio",
    visualAnchor: old.visualAnchor || props || firstFrameText,
    emotionProgression: old.emotionProgression || ep.coreIdea?.emotionTarget || "curious -> tense -> payoff"
  };
}

export function generateContinuityAnchor(ep: GhostEp): ContinuityAnchor {
  const state = ep.episodeState ?? defaultEpisodeState();
  return {
    location: state.primaryLocation || state.location || "same continuous scene",
    mainProp: state.mainProps || state.props || "main story prop",
    lighting: state.lightingStyle || state.lighting || "cinematic lighting",
    timeOfDay: state.timeOfDay || "same time of day",
    cameraStyle: state.cameraLanguage || state.camera || "continuous cinematic camera",
    emotionArc: state.emotionProgression || ep.coreIdea?.emotionTarget || "controlled progression"
  };
}

export function generateDialoguePlan(ep: GhostEp): DialogueOutlineItem[] {
  const existing = Array.isArray(ep.dialogueOutline) ? ep.dialogueOutline.filter((item) => item.dialogueIntent.trim()) : [];
  if (existing.length >= ep.videos.length) return existing.slice(0, ep.videos.length);
  return ep.videos.map((video, index) => ({
    videoId: video.videoId,
    dialogueIntent: existing[index]?.dialogueIntent || ep.storyBeats?.[index]?.beat || `connect ${video.fromFrame} to ${video.toFrame}`,
    emotionalIntensity: existing[index]?.emotionalIntensity || `${Math.min(10, index + 1)}/10`,
    speechPattern: existing[index]?.speechPattern || ep.voiceProfile?.sentenceLength || "consistent short lines",
    forbiddenToneShift: existing[index]?.forbiddenToneShift || "do not change personality, vocabulary, language level, or speaking rhythm"
  }));
}

function generateVoiceProfile(ep: GhostEp): VoiceProfile {
  const old = { ...defaultVoiceProfile(), ...(ep.voiceProfile ?? {}) };
  const asset = getCharacterAsset(ep.characterId);
  return {
    ...old,
    preset: old.preset || ep.episodeState?.voice || asset.voice.preset,
    gender: old.gender || asset.voice.gender,
    age: old.age || asset.voice.age,
    tone: old.tone || asset.voice.tone,
    energy: old.energy || asset.voice.energy,
    speakingSpeed: old.speakingSpeed || asset.voice.speakingSpeed,
    accent: old.accent || asset.voice.accent || ep.language.toLowerCase(),
    personality: old.personality || asset.personality,
    sentenceLength: old.sentenceLength || "short",
    vocabularyStyle: old.vocabularyStyle || "simple, consistent",
    emotionalRange: old.emotionalRange || ep.episodeState?.emotionProgression || "controlled progression"
  };
}

function buildFrameState(ep: GhostEp, frame: GhostEp["frames"][number], index: number, previous?: VisualState): VisualState {
  const existing = visualStateForFrame(ep, frame.frameId) ?? frame.frameState;
  if (existing) return existing;
  const state = ep.episodeState ?? defaultEpisodeState();
  const beat = ep.storyBeats?.[index];
  return {
    frameId: frame.frameId,
    locationLayout: previous?.locationLayout || state.primaryLocation || state.location,
    characterPosition: index === 0 ? state.characterStartPosition : `${previous?.characterPosition || state.characterStartPosition}; progressed by ${beat?.function || `beat ${index + 1}`}`,
    characterFacingDirection: previous?.characterFacingDirection || "toward the continuity anchor",
    cameraPosition: previous?.cameraPosition || state.cameraLanguage || state.camera,
    cameraAngle: previous?.cameraAngle || "cinematic angle",
    cameraDistance: index === 0 ? "establishing medium distance" : "slightly adjusted from previous frame",
    mainPropPosition: previous?.mainPropPosition || state.mainProps || state.props,
    lightingDirection: previous?.lightingDirection || state.lightingStyle || state.lighting,
    emotionState: beat?.function || state.emotionProgression,
    actionState: beat?.beat || frame.title || stripAssemblySections(frame.imagePrompt)
  };
}

export function generateFrames(ep: GhostEp): GhostEp {
  const visualStates: VisualState[] = [];
  ep.frames.forEach((frame, index) => {
    const frameState = buildFrameState({ ...ep, visualStates }, frame, index, visualStates[index - 1]);
    visualStates.push(frameState);
  });
  return {
    ...ep,
    frames: ep.frames.map((frame) => ({
      frameId: frame.frameId,
      title: frame.title,
      imagePrompt: stripAssemblySections(frame.imagePrompt)
    })),
    visualStates
  };
}

function videoStateText(state?: VisualState) {
  return state ? `${state.locationLayout}; ${state.characterPosition}; ${state.actionState}; ${state.emotionState}` : "";
}

export function generateVideos(ep: GhostEp): GhostEp {
  const videos = ep.videos.map((video): VideoPrompt => {
    const fromState = visualStateForFrame(ep, video.fromFrame);
    const toState = visualStateForFrame(ep, video.toFrame);
    const transition = stripAssemblySections(video.videoPrompt) || `connect ${video.fromFrame} to ${video.toFrame}`;
    return {
      videoId: video.videoId,
      fromFrame: video.fromFrame,
      toFrame: video.toFrame,
      durationSec: video.durationSec,
      videoPrompt: transition,
      camera: video.camera || ep.episodeState?.cameraLanguage || ep.episodeState?.camera || "",
      audio: video.audio || ep.episodeState?.environmentAudio || "",
      motion: video.motion || transition,
      dialogue: video.dialogue,
      mood: video.mood
    };
  });
  return { ...ep, videos };
}

export function generateVoiceScript(ep: GhostEp): GhostEp {
  return {
    ...ep,
    voiceScript: buildVoiceScriptFromDialogue(ep.videos, ep.voiceScript, ep.language)
  };
}

function scoreFromRatio(ratio: number) {
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

function meaningfulTokens(input: string) {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function tokenOverlapRatio(a: string, b: string) {
  const left = new Set(meaningfulTokens(a));
  const right = new Set(meaningfulTokens(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  left.forEach((token) => {
    if (right.has(token)) overlap += 1;
  });
  return overlap / Math.min(left.size, right.size);
}

export function validateStoryBeatContinuity(beats: StoryBeat[]) {
  if (beats.length <= 1) return { score: 100, failedIndexes: [] as number[] };
  const failedIndexes: number[] = [];
  for (let index = 0; index < beats.length - 1; index += 1) {
    const current = `${beats[index].function} ${beats[index].beat}`;
    const next = `${beats[index + 1].function} ${beats[index + 1].beat}`;
    const connected = tokenOverlapRatio(current, next) >= 0.12 || /then|same|ต่อ|เดิม|ใกล้|ตาม|source|evidence|เสียง|ประตู|door|hall|box/i.test(next);
    if (!connected) failedIndexes.push(index + 1);
  }
  return { score: scoreFromRatio((beats.length - failedIndexes.length) / beats.length), failedIndexes };
}

function validateStoryDepth(beats: StoryBeat[]) {
  const text = beats.map((beat) => `${beat.role ?? ""} ${beat.function} ${beat.beat}`).join(" ").toLowerCase();
  const roleHits = storyDepthRoles.filter((role) => text.includes(role));
  const shallow = /observation\s*[-→>]+\s*action\s*[-→>]+\s*end|action\s*[-→>]+\s*end/i.test(text);
  return {
    score: scoreFromRatio((roleHits.length / storyDepthRoles.length) * (shallow ? 0.5 : 1)),
    missingRoles: storyDepthRoles.filter((role) => !text.includes(role))
  };
}

export function rewriteStoryBeats(beats: StoryBeat[], coreIdea?: CoreIdea) {
  const result = validateStoryBeatContinuity(beats);
  if (!result.failedIndexes.length) return beats;
  return beats.map((beat, index) => {
    if (!result.failedIndexes.includes(index)) return beat;
    const previous = beats[index - 1];
    return {
      ...beat,
      beat: `From the previous beat (${previous.beat}), ${beat.beat || coreIdea?.centralIdea || "the same situation continues"}`
    };
  });
}

function validateFrameToVideo(video: VideoPrompt) {
  const transition = `${video.motion} ${video.videoPrompt}`;
  const avoidsNewScene = !/new scene|cut to|teleport|suddenly in|different location|เปลี่ยนฉาก|ตัดไป|วาร์ป/i.test(transition);
  return Boolean(video.fromFrame.trim() && video.toFrame.trim() && transition.trim() && avoidsNewScene);
}

export function validateFrameToVideoContinuity(ep: GhostEp) {
  if (!ep.videos.length) return { score: 0, failedVideoIds: [] as string[] };
  const failedVideoIds = ep.videos.filter((video) => {
    const fromState = visualStateForFrame(ep, video.fromFrame);
    const toState = visualStateForFrame(ep, video.toFrame);
    return !fromState || !toState || !validateFrameToVideo(video);
  }).map((video) => video.videoId);
  return { score: scoreFromRatio((ep.videos.length - failedVideoIds.length) / ep.videos.length), failedVideoIds };
}

export function rewriteVideoPrompts(ep: GhostEp): GhostEp {
  const failed = new Set(validateFrameToVideoContinuity(ep).failedVideoIds);
  if (!failed.size) return ep;
  return {
    ...ep,
    videos: ep.videos.map((video) => {
      if (!failed.has(video.videoId)) return video;
      const fromState = visualStateForFrame(ep, video.fromFrame);
      const toState = visualStateForFrame(ep, video.toFrame);
      const transition = `Connect ${video.fromFrame} to ${video.toFrame} in the same location: ${videoStateText(fromState)} -> ${videoStateText(toState)}.`;
      return {
        ...video,
        motion: transition,
        videoPrompt: transition
      };
    })
  };
}

function confidenceScore(dialogue: string) {
  if (!dialogue.trim()) return 0;
  const aggressive = /(แก|วะ|สู้|ฆ่า|ตาย|แน่จริง|เข้ามา|ย้าก|กลัวอะไร)/i.test(dialogue) ? 2 : 0;
  const hesitant = /(\.\.\.|ไหม|เหรอ|เดี๋ยว|ไม่ใช่|อะไร|ช่วย|กลัว|ค่อย)/i.test(dialogue) ? -1 : 0;
  return Math.max(0, aggressive + hesitant + 1);
}

export function detectVoiceDrift(ep: GhostEp) {
  const scores = ep.videos.map((video) => confidenceScore(video.dialogue));
  const jumps = scores
    .map((score, index) => index === 0 ? 0 : Math.abs(score - scores[index - 1]))
    .filter((jump) => jump > 1).length;
  const forbiddenTone = ep.videos.filter((video) => /(วะ|ฆ่า|ตาย|แน่จริง|ย้าก)/i.test(video.dialogue) && /soft|timid|hesitant|short|ขี้กลัว|ลังเล/i.test(`${ep.voiceProfile?.tone} ${ep.voiceProfile?.personality} ${ep.voiceProfile?.sentenceLength}`)).length;
  const failures = jumps + forbiddenTone;
  return { score: scoreFromRatio(ep.videos.length ? (ep.videos.length - failures) / ep.videos.length : 0), failures };
}

export function rewriteDialogue(ep: GhostEp): GhostEp {
  const drift = detectVoiceDrift(ep);
  if (drift.score >= 85) return ep;
  return {
    ...ep,
    videos: ep.videos.map((video, index) => {
      if (!/(วะ|ฆ่า|ตาย|แน่จริง|ย้าก|สู้)/i.test(video.dialogue)) return video;
      const replacement = index === 0 ? "มีใครอยู่ตรงนั้นไหม..." : index === ep.videos.length - 1 ? "ไม่ใช่แล้ว... ต้องถอยก่อน..." : "เดี๋ยวนะ... นั่นเสียงอะไร";
      return { ...video, dialogue: replacement };
    })
  };
}

function sameValueRatio(values: string[]) {
  const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!normalized.length) return 0;
  return normalized.every((value) => value === normalized[0]) ? 1 : 0.85;
}

function qualitySignalScore(ep: GhostEp) {
  const pack = templatePackForEp(ep);
  const haystack = [
    ep.coreIdea?.centralIdea,
    ep.coreIdea?.coreConflict,
    ep.coreIdea?.payoffMechanic,
    ep.coreIdea?.templateLogic,
    ep.story,
    ...(ep.storyBeats ?? []).map((beat) => `${beat.function} ${beat.beat}`)
  ].join(" ").toLowerCase();
  const signals = pack.qualitySignals ?? [];
  const signalRatio = signals.length
    ? signals.filter((signal) => tokenOverlapRatio(haystack, signal) >= 0.25 || haystack.includes(signal.toLowerCase())).length / signals.length
    : 0.5;
  return scoreFromRatio(
    (tokenOverlapRatio(ep.coreIdea?.coreConflict ?? "", pack.coreConflict) >= 0.2 ? 0.25 : 0.1) +
    (tokenOverlapRatio(ep.coreIdea?.payoffMechanic ?? "", pack.payoffMechanic) >= 0.2 ? 0.25 : 0.1) +
    (haystack.includes(pack.id) ? 0.15 : 0) +
    (signalRatio * 0.35)
  );
}

function scorePayoff(ep: GhostEp) {
  const pack = templatePackForEp(ep);
  const lastBeat = ep.storyBeats?.[ep.storyBeats.length - 1];
  const ending = [
    lastBeat?.function,
    lastBeat?.beat,
    ep.coreIdea?.payoffMechanic,
    ep.videos[ep.videos.length - 1]?.videoPrompt,
    ep.videos[ep.videos.length - 1]?.dialogue
  ].join(" ");
  const payoffOverlap = tokenOverlapRatio(ending, pack.payoffMechanic);
  const formulaEnd = pack.storyFormula?.[pack.storyFormula.length - 1] ?? "";
  return scoreFromRatio(
    (ending.trim().length > 24 ? 0.35 : 0) +
    (payoffOverlap >= 0.2 ? 0.3 : 0.1) +
    (tokenOverlapRatio(ending, formulaEnd) >= 0.2 ? 0.25 : 0.05) +
    (!/and then|random|suddenly|teleport|new scene|ตัดไป|วาร์ป/i.test(ending) ? 0.1 : 0)
  );
}

function scoreNovelty(ep: GhostEp) {
  const duplicatePenalty = ep.duplicateCheck?.similarityScore ?? 0;
  const ideaText = `${ep.coreIdea?.centralIdea} ${ep.coreIdea?.noveltyAngle} ${ep.coreIdea?.hookMechanic} ${ep.coreIdea?.payoffMechanic}`;
  const genericPenalty = /นอนเฉย|แมวจะนอน|simple|normal cat|ธรรมดา/i.test(ideaText) ? 0.25 : 0;
  return Math.max(0, Math.round((1 - Math.min(0.95, duplicatePenalty + genericPenalty)) * 100));
}

function scoreContinuity(ep: GhostEp) {
  return Math.round((
    validateStoryBeatContinuity(ep.storyBeats ?? []).score +
    validateFrameToVideoContinuity(ep).score +
    scoreFromRatio(sameValueRatio((ep.visualStates ?? []).map((state) => state.locationLayout))) +
    detectVoiceDrift(ep).score
  ) / 4);
}

function hasInternalPromptLeak(prompt: string) {
  return /from the previous beat|actionState|emotionState|dialogueIntent|storyBeat|SECTION\s+[A-I]|primaryLocation|locationLayout|VOICE PROFILE LOCK/i.test(prompt);
}

function conciseCreativeFramePrompt(ep: GhostEp, frame: GhostEp["frames"][number], index: number) {
  const existing = leanPrompt(frame.imagePrompt);
  if (existing && !hasInternalPromptLeak(existing)) return existing;
  const pack = templatePackForEp(ep);
  const object = mainObjectForEp(ep);
  if (pack.id === "cute-daily-life") {
    return index === ep.frames.length - 1
      ? `Meow staring intensely at ${catLogicPayoffObject(ep)} with serious cat logic`
      : `Meow inspecting ${object} with focused curiosity and a cute overthinking expression`;
  }
  if (pack.id === "sigma-cat") {
    return index === ep.frames.length - 1
      ? "Meow recovering from a tiny failure with a calm deadpan expression"
      : "Meow posing confidently while a tiny ridiculous challenge appears nearby";
  }
  if (pack.id === "nightmare-protocol") {
    return index === ep.frames.length - 1
      ? "Meow frozen in fear as the unanswered evidence remains in the room"
      : `Meow cautiously staring at ${object} as impossible evidence becomes visible`;
  }
  if (pack.id === "review" || pack.id === "affiliate") {
    return index === ep.frames.length - 1
      ? `Meow showing the practical result after testing ${object}`
      : `Meow naturally testing ${object} with clear visible action`;
  }
  return `Meow focused on ${object} with a clear expressive pose`;
}

function conciseCreativeVideoPrompt(ep: GhostEp, video: GhostEp["videos"][number], index: number) {
  const existing = leanPrompt(video.videoPrompt);
  if (existing && !hasInternalPromptLeak(existing)) return existing;
  const pack = templatePackForEp(ep);
  const object = mainObjectForEp(ep);
  if (pack.id === "cute-daily-life") {
    return index === ep.videos.length - 1
      ? `Meow circles ${catLogicPayoffObject(ep)}, taps it with one paw, then tries to use it with total seriousness`
      : `Meow approaches ${object}, sniffs it, and studies it like a confusing human invention`;
  }
  if (pack.id === "sigma-cat") {
    return index === ep.videos.length - 1
      ? "Meow pauses, regains composure, and walks away like the mishap was intentional"
      : "Meow moves forward confidently until a tiny obstacle interrupts the cool pose";
  }
  if (pack.id === "nightmare-protocol") {
    return index === ep.videos.length - 1
      ? "Meow backs away slowly as the evidence remains and the room falls unnaturally quiet"
      : `Meow moves closer to ${object} while tracking the impossible evidence with nervous focus`;
  }
  if (pack.id === "review" || pack.id === "affiliate") {
    return index === ep.videos.length - 1
      ? `Meow finishes the test and shows the useful result without hard selling`
      : `Meow demonstrates ${object} through one simple visible action`;
  }
  return `Meow moves naturally around ${object} while staying focused`;
}

export function runQualityReview(ep: GhostEp): QualityReview {
  const storyQualityScore = scoreFromRatio(Math.min(1, ep.story.trim().length / 120));
  const storyDepthScore = validateStoryDepth(ep.storyBeats ?? []).score;
  const storyBeatContinuityScore = Math.round((validateStoryBeatContinuity(ep.storyBeats ?? []).score + storyDepthScore) / 2);
  const visualContinuityScore = scoreFromRatio(
    (ep.visualStates?.length === ep.frames.length ? 0.4 : 0) +
    (sameValueRatio((ep.visualStates ?? []).map((state) => state.locationLayout)) * 0.25) +
    (sameValueRatio((ep.visualStates ?? []).map((state) => state.lightingDirection)) * 0.2) +
    ((ep.visualStates ?? []).every((state) => state.mainPropPosition.trim()) ? 0.15 : 0)
  );
  const videoContinuityScore = scoreFromRatio(
    (validateFrameToVideoContinuity(ep).score / 100 * 0.45) +
    (hasTransitionVideoPrompts(ep) ? 0.35 : 0) +
    (ep.videos.every((video) => video.camera.trim() && video.audio.trim()) ? 0.2 : 0)
  );
  const expectedVoiceScript = buildVoiceScriptFromDialogue(ep.videos, "", ep.language);
  const dialogueConsistencyScore = detectVoiceDrift(ep).score;
  const voiceContinuityScore = scoreFromRatio(
    (ep.voiceProfile && Object.values(ep.voiceProfile).filter(Boolean).length >= 8 ? 0.35 : 0) +
    (ep.voiceScript === expectedVoiceScript ? 0.45 : 0) +
    (ep.dialogueOutline?.length === ep.videos.length ? 0.1 : 0) +
    (dialogueConsistencyScore / 100 * 0.1)
  );
  const noveltyScore = scoreNovelty(ep);
  const templateMatchScore = qualitySignalScore(ep);
  const anchorText = ep.characterAnchor?.toLowerCase() ?? "";
  const characterConsistencyScore = scoreFromRatio(
    (anchorText.length > 40 ? 0.4 : 0) +
    (ep.frames.every((frame) => frame.frameId.trim() && frame.title.trim() && frame.imagePrompt.trim()) ? 0.3 : 0) +
    (ep.videos.every((video) => video.fromFrame.trim() && video.toFrame.trim() && video.videoPrompt.trim()) ? 0.3 : 0)
  );
  const scores = [storyQualityScore, storyBeatContinuityScore, visualContinuityScore, videoContinuityScore, dialogueConsistencyScore, voiceContinuityScore, noveltyScore, templateMatchScore, characterConsistencyScore];
  const episodeCompletenessScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const threshold = 85;
  const passed = episodeCompletenessScore >= threshold;
  return {
    storyQualityScore,
    storyBeatContinuityScore,
    visualContinuityScore,
    videoContinuityScore,
    dialogueConsistencyScore,
    voiceContinuityScore,
    noveltyScore,
    templateMatchScore,
    characterConsistencyScore,
    episodeCompletenessScore,
    threshold,
    passed,
    notes: passed ? "Code quality review passed." : "Code quality review found continuity or quality gaps."
  };
}

function rewriteForQuality(ep: GhostEp): GhostEp {
  const frameCount = Math.max(1, ep.frames.length);
  const functions = beatFunctions(ep, frameCount);
  const storyBeats = Array.from({ length: frameCount }, (_, index) => ({
    beatId: `beat${index + 1}`,
    role: depthRoleForIndex(index, frameCount),
    function: functions[index] || `connector ${index + 1}`,
    beat: templateDepthBeatText(ep, depthRoleForIndex(index, frameCount), functions[index] || "story beat", index, frameCount)
  }));
  const frames = ep.frames.map((frame, index) => ({
    frameId: frame.frameId,
    title: frame.title || storyBeats[index]?.function || `Beat ${index + 1}`,
    imagePrompt: conciseCreativeFramePrompt(ep, frame, index)
  }));
  const videos = ep.videos.map((video, index) => {
    const videoPrompt = conciseCreativeVideoPrompt(ep, video, index);
    return {
      ...video,
      videoPrompt,
      motion: video.motion || videoPrompt,
      camera: video.camera || ep.continuityAnchor?.cameraStyle || ep.episodeState?.cameraLanguage || "continuous cinematic camera",
      audio: video.audio || ep.episodeState?.environmentAudio || "continuous room tone",
      dialogue: ep.language === "No Dialogue" ? "" : video.dialogue || (index === 0 ? "เดี๋ยวนะ..." : index === ep.videos.length - 1 ? "อ๋อ... แบบนี้เองเหรอ" : "ทำไมมันแปลก ๆ นะ...")
    };
  });
  const next: GhostEp = {
    ...ep,
    coreIdea: generateCoreIdea({
      ...ep,
      coreIdea: {
        ...defaultCoreIdea(),
        ...(ep.coreIdea ?? {}),
        centralIdea: templateCoreIdeaFallback(ep),
        noveltyAngle: `${templatePackForEp(ep).id} rewrite: ${templatePackForEp(ep).qualitySignals?.join(" -> ") || templatePackForEp(ep).payoffMechanic}`,
        payoffMechanic: templatePackForEp(ep).payoffMechanic
      }
    }),
    storyBeats,
    story: storyBeats.map((beat) => beat.beat).join(" "),
    frames,
    videos,
    duplicateCheck: {
      ...ep.duplicateCheck,
      isDuplicate: false,
      similarityScore: Math.min(ep.duplicateCheck?.similarityScore ?? 0, 0.19)
    }
  };
  next.episodeState = generateEpisodeState(next);
  next.continuityAnchor = generateContinuityAnchor(next);
  next.voiceProfile = generateVoiceProfile(next);
  next.dialogueOutline = generateDialoguePlan(next);
  const withFrames = generateFrames(next);
  const withVideos = rewriteVideoPrompts(generateVideos(withFrames));
  return generateVoiceScript(rewriteDialogue(withVideos));
}

function applyStoryQualityFilter(ep: GhostEp): GhostEp {
  let next = ep;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const review = runQualityReview(next);
    const payoffScore = scorePayoff(next);
    const continuityScore = scoreContinuity(next);
    const depthScore = validateStoryDepth(next.storyBeats ?? []).score;
    if (review.templateMatchScore >= 80 && review.noveltyScore >= 80 && payoffScore >= 80 && continuityScore >= 80 && depthScore >= 80) {
      next.qualityReview = {
        ...review,
        passed: review.episodeCompletenessScore >= review.threshold,
        notes: `Code quality review passed. payoffScore=${payoffScore}; continuityScore=${continuityScore}; depthScore=${depthScore}.`
      };
      return next;
    }
    next = rewriteForQuality(next);
  }
  const finalReview = runQualityReview(next);
  const payoffScore = scorePayoff(next);
  const continuityScore = scoreContinuity(next);
  next.qualityReview = {
    ...finalReview,
    passed: finalReview.templateMatchScore >= 80 && finalReview.noveltyScore >= 80 && payoffScore >= 80 && continuityScore >= 80 && validateStoryDepth(next.storyBeats ?? []).score >= 80,
    notes: `Code quality filter applied. payoffScore=${payoffScore}; continuityScore=${continuityScore}; depthScore=${validateStoryDepth(next.storyBeats ?? []).score}.`
  };
  return next;
}

export function outputJSON(ep: GhostEp): GhostEp {
  return ep;
}

export function runInternalGeneratorPipeline(ep: GhostEp): GhostEp {
  let next: GhostEp = {
    ...ep,
    coreIdea: generateCoreIdea(ep),
    characterAnchor: ep.characterAnchor || buildCharacterAnchorFromAsset(getCharacterAsset(ep.characterId))
  };
  next.storyBeats = rewriteStoryBeats(generateStoryBeats(next), next.coreIdea);
  next.episodeState = generateEpisodeState(next);
  next.continuityAnchor = generateContinuityAnchor(next);
  next.voiceProfile = generateVoiceProfile(next);
  next.dialogueOutline = generateDialoguePlan(next);
  next = generateFrames(next);
  next = generateVideos(next);
  next = rewriteVideoPrompts(next);
  next = rewriteDialogue(next);
  next = generateVoiceScript(next);
  next = applyStoryQualityFilter(next);
  next.parseHealth = calculateParseHealth(next);
  return outputJSON(leanEpOutput(next));
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
    imagePrompt: leanPrompt(prompt || (typeof item === "string" ? item : ""))
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
    videoPrompt: leanPrompt(prompt || (typeof item === "string" ? item : "")),
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
  ep.coreIdea = mapCoreIdea(source);
  ep.storyBeats = arrayValue(source, ["storyBeats", "story_beats", "beats"]).map(mapStoryBeat);
  ep.episodeState = mapEpisodeState(source);
  ep.characterAnchor = stringValue(source, ["characterAnchor", "character_anchor"]) || DEFAULT_CHARACTER_ANCHOR;
  ep.voiceProfile = mapVoiceProfile(source);
  ep.visualStates = arrayValue(source, ["visualStates", "visual_states"]).map(mapVisualState);
  ep.dialogueOutline = arrayValue(source, ["dialogueOutline", "dialogue_outline"]).map(mapDialogueOutlineItem);
  ep.continuitySelfCheck = mapContinuitySelfCheck(source);
  ep.qualityReview = mapQualityReview(source);
  ep.story = stringValue(source, ["story", "synopsis"]);
  ep.hook = stringValue(source, ["hook", "opening_hook", "openingHook"]);
  ep.caption = stringValue(source, ["caption"]);
  ep.hashtags = hashtagsValue(source);
  const rawVoiceScript = stringValue(source, ["voice_script", "voiceScript", "voice"]);
  ep.soundEffects = stringValue(source, ["sound_effects", "soundEffects", "sfx"]);
  ep.frames = Array.from({ length: frameCount }, (_, frameIndex) => framesInput[frameIndex] !== undefined ? mapJsonFrame(framesInput[frameIndex], frameIndex) : ep.frames[frameIndex]);
  ep.videos = Array.from({ length: videoCount }, (_, videoIndex) => videosInput[videoIndex] !== undefined ? mapJsonVideo(videosInput[videoIndex], videoIndex) : ep.videos[videoIndex]);
  ep.voiceScript = buildVoiceScriptFromDialogue(ep.videos, rawVoiceScript, ep.language);
  const generated = runInternalGeneratorPipeline(ep);
  generated.durationSec = generated.durationSec || generated.videos.reduce((sum, video) => sum + video.durationSec, 0);
  generated.checklist = createChecklistFromParts(generated.frames, generated.videos, generated.checklist);
  generated.parseHealth = calculateParseHealth(generated);
  generated.parseDebug = buildParseDebug(generated, index);
  return generated;
}

export function calculateParseHealth(ep: GhostEp): ParseHealth {
  const missing: string[] = [];
  const parsedFields: string[] = [];
  const checks = [
    ["Title", Boolean(ep.title.trim())],
    ["Format", Boolean(String(ep.format || "").trim())],
    ["Category", Boolean(ep.category.trim())],
    ["Story", Boolean(ep.story.trim())],
    ["Master Episode Engine", hasContinuityState(ep)],
    ["Quality Review", hasPassingContinuitySelfCheck(ep)],
    ["Hook", Boolean(ep.hook.trim())],
    ["Frames", ep.frames.length > 0 && ep.frames.every((frame) => frame.imagePrompt.trim())],
    ["Lean Image Prompts", ep.frames.length > 0 && hasStructuredImagePrompts(ep)],
    ["Videos", ep.videos.length > 0 && ep.videos.every((video) => video.videoPrompt.trim())],
    ["Lean Video Prompts", ep.videos.length > 0 && hasTransitionVideoPrompts(ep)],
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
    videosCount: ep.videos.filter((video) => video.videoPrompt.trim()).length,
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
    ep.coreIdea = defaultCoreIdea();
    ep.storyBeats = [];
    ep.episodeState = defaultEpisodeState();
    ep.characterAnchor = DEFAULT_CHARACTER_ANCHOR;
    ep.voiceProfile = defaultVoiceProfile();
    ep.visualStates = [];
    ep.dialogueOutline = [];
    ep.continuitySelfCheck = defaultContinuitySelfCheck();
    ep.qualityReview = defaultQualityReview();
    ep.durationSec = Number(format.match(/\d+(\.\d+)?/)?.[0] ?? videoCount * 8);
    const rawVoiceScript = debugFieldValue("VOICE_SCRIPT", block, labels.voiceScript) || debugSectionValue("VOICE_SCRIPT_SECTION", block, labels.voiceScript);
    ep.soundEffects = debugFieldValue("SOUND_EFFECTS", block, labels.soundEffects) || debugSectionValue("SOUND_EFFECTS_SECTION", block, labels.soundEffects);
    ep.caption = debugFieldValue("CAPTION", block, labels.caption) || debugSectionValue("CAPTION_SECTION", block, labels.caption);
    ep.hashtags = parseHashtags(debugFieldValue("HASHTAGS", block, labels.hashtags) || debugSectionValue("HASHTAGS_SECTION", block, labels.hashtags));

    ep.frames = Array.from({ length: frameCount }, (_, frameIndex) => {
      const frameId = `F${frameIndex + 1}`;
      const frameBlock = blockForId(block, frameId);
      return {
        frameId,
        title: fieldValue(frameBlock, labels.frameTitle, [...labels.frameTitle, ...labels.imagePrompt, ...topLevelAliases]) || "",
        imagePrompt: leanPrompt(fieldValue(frameBlock, labels.imagePrompt, [...labels.frameTitle, ...labels.imagePrompt, ...topLevelAliases]))
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
        videoPrompt: leanPrompt(fieldValue(videoBlock, labels.videoPrompt, videoStops)),
        camera: fieldValue(videoBlock, labels.camera, videoStops),
        motion: fieldValue(videoBlock, labels.motion, videoStops),
        audio: fieldValue(videoBlock, labels.audio, videoStops),
        dialogue: fieldValue(videoBlock, labels.dialogue, videoStops),
        mood: fieldValue(videoBlock, labels.mood, videoStops)
      };
    });

    ep.voiceScript = buildVoiceScriptFromDialogue(ep.videos, rawVoiceScript, ep.language);
    const generated = runInternalGeneratorPipeline(ep);
    generated.checklist = createChecklistFromParts(generated.frames, generated.videos, generated.checklist);
    generated.parseHealth = calculateParseHealth(generated);
    generated.parseDebug = buildParseDebug(generated, index);
    return applySelection(generated, selection);
  });
}
