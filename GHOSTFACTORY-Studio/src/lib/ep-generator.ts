import type { CharacterProfile, ContentGoal, ContinuityAnchor, ContinuitySelfCheck, CoreIdea, DailyBatch, DialogueOutlineItem, EpisodeFacts, EpisodeState, GeneratorSelection, GhostEp, IdeaMemory, ParseDebug, ParseHealth, QualityReview, Settings, SpokenLanguage, StoryBeat, VideoPrompt, VisualState, VoiceProfile } from "./types";
import { createChecklistFromParts } from "./checklist";
import { frameCountForTemplatePack, getTemplatePack } from "./template-packs";
import { buildCharacterAnchorFromAsset, getCharacterAsset } from "./character-assets";

const DEBUG_PARSE = false;
const CHARACTER_LOCK =
  "Meow, fluffy orange tabby cat, orange striped fur, cute expressive face, high quality fur, Pixar-quality 3D animation";
const DEFAULT_CHARACTER_ANCHOR = buildCharacterAnchorFromAsset(getCharacterAsset("meow"));
const GLOBAL_NEGATIVE_RULES =
  "no subtitles, no caption overlay, no text overlay, no watermark, no logo, no background music by default, vertical 9:16, commercial quality visuals";
const productionBlockedPattern =
  /\b(Observation|Problem|Obstacle|Payoff|Goal|Escalation|Story Beat|Beat)\s*:|Main Story Prop|main story prop|least useful object nearby|same continuous scene|previous beat|from the previous beat|human expectation|cat inspection|overthinking|absurd cat decision|template logic|continuity anchor|visual anchor|emotion progression|matching\s+F\d+|\btransition\b|start state\s*:|end state\s*:/i;
export const QUALITY_GATE_V3_MIN_SCORE = 70;
export const QUALITY_GATE_V3_MAX_REGENERATION_ATTEMPTS = 3;
export const QUALITY_GATE_V3_FAILED_MESSAGE = "Generation Failed Quality Gate";
const storyArchetypePool = [
  "Investigation",
  "Mission",
  "Training",
  "Competition",
  "Mistake",
  "Revenge",
  "Collection",
  "Experiment",
  "Fake Documentary",
  "Survival",
  "Treasure Hunt",
  "Sigma Cat",
  "POV",
  "Cute Horror",
  "Daily Life"
] as const;

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

function stableNumber(input: string) {
  return Array.from(input).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function selectStoryArchetype(ep: GhostEp) {
  if (ep.storyArchetype?.trim()) return ep.storyArchetype.trim();
  const pack = getTemplatePack(`${ep.templateId} ${ep.templateName} ${ep.category} ${ep.contentGoal}`);
  if (pack.id === "sigma-cat") return "Sigma Cat";
  if (/pov/i.test(`${ep.templateId} ${ep.templateName} ${ep.category}`)) return "POV";
  const indexMatch = ep.id.match(/(\d+)(?!.*\d)/);
  const index = indexMatch ? Number(indexMatch[1]) - 1 : stableNumber(`${ep.title} ${ep.hook} ${ep.category}`);
  return storyArchetypePool[((index % storyArchetypePool.length) + storyArchetypePool.length) % storyArchetypePool.length];
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
    storyDepthScore: 0,
    promptDetailScore: 0,
    storyBeatContinuityScore: 0,
    visualContinuityScore: 0,
    videoContinuityScore: 0,
    dialogueConsistencyScore: 0,
    voiceContinuityScore: 0,
    storyBeatAlignmentScore: 0,
    hookBeatConsistencyScore: 0,
    dialogueBeatConsistencyScore: 0,
    templateToneConsistencyScore: 0,
    endingMechanicScore: 0,
    objectConsistencyScore: 0,
    crossFieldConsistencyScore: 0,
    repetitionScore: 0,
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
    storyArchetype: "",
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
  "คลิป",
  "Core Idea",
  "Episode State",
  "Voice Profile",
  "Quality Review",
  "Parse Health",
  "Duplicate Check",
  "Story Beats",
  "Visual States",
  "Dialogue Outline"
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
    beat: stringValue(beat, ["beat", "storyBeat", "story_beat", "description", "visibleEvent", "visible_event", "event"]) || (typeof item === "string" ? item : ""),
    beatFunction: stringValue(beat, ["beatFunction", "beat_function", "function"]) || role,
    visibleEvent: stringValue(beat, ["visibleEvent", "visible_event", "event"]),
    characterAction: stringValue(beat, ["characterAction", "character_action", "action"]),
    characterEmotion: stringValue(beat, ["characterEmotion", "character_emotion", "emotion"]),
    environmentChange: stringValue(beat, ["environmentChange", "environment_change", "environment"]),
    mainPropState: stringValue(beat, ["mainPropState", "main_prop_state", "propState", "prop_state"]),
    dialogueIntent: stringValue(beat, ["dialogueIntent", "dialogue_intent"]),
    tensionLevel: scoreValue(beat, ["tensionLevel", "tension_level", "tension"]),
    endingRole: stringValue(beat, ["endingRole", "ending_role"])
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
    storyDepthScore: scoreValue(review, ["storyDepthScore", "story_depth_score"]) || scoreValue(source, ["storyDepthScore", "story_depth_score"]),
    promptDetailScore: scoreValue(review, ["promptDetailScore", "prompt_detail_score"]) || scoreValue(source, ["promptDetailScore", "prompt_detail_score"]),
    storyBeatContinuityScore: scoreValue(review, ["storyBeatContinuityScore", "story_beat_continuity_score"]) || scoreValue(source, ["storyBeatContinuityScore", "story_beat_continuity_score"]),
    visualContinuityScore: scoreValue(review, ["visualContinuityScore", "visual_continuity_score"]) || scoreValue(oldCheck, ["frameContinuityScore", "frame_continuity_score"]) || scoreValue(source, ["visualContinuityScore", "visual_continuity_score"]),
    videoContinuityScore: scoreValue(review, ["videoContinuityScore", "video_continuity_score"]) || scoreValue(oldCheck, ["videoContinuityScore", "video_continuity_score"]) || scoreValue(source, ["videoContinuityScore", "video_continuity_score"]),
    dialogueConsistencyScore: scoreValue(review, ["dialogueConsistencyScore", "dialogue_consistency_score"]) || scoreValue(source, ["dialogueConsistencyScore", "dialogue_consistency_score"]),
    voiceContinuityScore: scoreValue(review, ["voiceContinuityScore", "voice_continuity_score"]) || scoreValue(oldCheck, ["voiceContinuityScore", "voice_continuity_score"]) || scoreValue(source, ["voiceContinuityScore", "voice_continuity_score"]),
    storyBeatAlignmentScore: scoreValue(review, ["storyBeatAlignmentScore", "story_beat_alignment_score"]) || scoreValue(source, ["storyBeatAlignmentScore", "story_beat_alignment_score"]),
    hookBeatConsistencyScore: scoreValue(review, ["hookBeatConsistencyScore", "hook_beat_consistency_score"]) || scoreValue(source, ["hookBeatConsistencyScore", "hook_beat_consistency_score"]),
    dialogueBeatConsistencyScore: scoreValue(review, ["dialogueBeatConsistencyScore", "dialogue_beat_consistency_score"]) || scoreValue(source, ["dialogueBeatConsistencyScore", "dialogue_beat_consistency_score"]),
    templateToneConsistencyScore: scoreValue(review, ["templateToneConsistencyScore", "template_tone_consistency_score"]) || scoreValue(source, ["templateToneConsistencyScore", "template_tone_consistency_score"]),
    endingMechanicScore: scoreValue(review, ["endingMechanicScore", "ending_mechanic_score"]) || scoreValue(source, ["endingMechanicScore", "ending_mechanic_score"]),
    objectConsistencyScore: scoreValue(review, ["objectConsistencyScore", "object_consistency_score"]) || scoreValue(source, ["objectConsistencyScore", "object_consistency_score"]),
    crossFieldConsistencyScore: scoreValue(review, ["crossFieldConsistencyScore", "cross_field_consistency_score"]) || scoreValue(source, ["crossFieldConsistencyScore", "cross_field_consistency_score"]),
    repetitionScore: scoreValue(review, ["repetitionScore", "repetition_score"]) || scoreValue(source, ["repetitionScore", "repetition_score"]),
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
    passed: next.passed || [next.storyQualityScore, next.storyDepthScore, next.promptDetailScore, next.storyBeatContinuityScore, next.visualContinuityScore, next.videoContinuityScore, next.dialogueConsistencyScore, next.voiceContinuityScore, next.storyBeatAlignmentScore, next.hookBeatConsistencyScore, next.dialogueBeatConsistencyScore, next.templateToneConsistencyScore, next.endingMechanicScore, next.objectConsistencyScore, next.crossFieldConsistencyScore, next.repetitionScore, next.noveltyScore, next.templateMatchScore, next.characterConsistencyScore, next.episodeCompletenessScore].every((score) => score >= next.threshold)
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
  return Boolean(review?.passed && [review.storyQualityScore, review.storyDepthScore, review.promptDetailScore, review.visualContinuityScore, review.videoContinuityScore, review.voiceContinuityScore, review.storyBeatAlignmentScore, review.hookBeatConsistencyScore, review.dialogueBeatConsistencyScore, review.templateToneConsistencyScore, review.endingMechanicScore, review.objectConsistencyScore, review.crossFieldConsistencyScore, review.repetitionScore, review.noveltyScore, review.templateMatchScore, review.characterConsistencyScore].every((score) => score >= review.threshold));
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

export function leanPrompt(prompt: string) {
  return stripAssemblySections(prompt)
    .replace(CHARACTER_LOCK, "")
    .replace(GLOBAL_NEGATIVE_RULES, "")
    .replace(/From the previous beat\s*\([^)]*\),?\s*/gi, "")
    .replace(/\b(actionState|emotionState|dialogueIntent|storyBeat|emotionalIntensity|template logic|continuity anchor|visual anchor|emotion progression):\s*[^.。!?\n]+/gi, "")
    .replace(/\b(Observation|Problem|Obstacle|Payoff|Goal|Escalation|Story Beat|Beat|hook|evidence|realization|final approach|first action)\s*:\s*/gi, "")
    .replace(/\s*\.?\s*$/, "")
    .replace(/^\s*[.,;:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasProductionBlockedText(text: string) {
  return productionBlockedPattern.test(text);
}

function sanitizeProductionText(text: string) {
  return leanPrompt(text)
    .replace(/\b(main story prop|least useful object nearby|same continuous scene|previous beat|human expectation|cat inspection|overthinking|absurd cat decision|template logic|continuity anchor|visual anchor|emotion progression)\b/gi, "")
    .replace(/\bmatching\s+F\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^\s*[.,;:-]\s*/, "")
    .trim();
}

export function renderImagePrompt(ep: GhostEp, frame: GhostEp["frames"][number], index = ep.frames.findIndex((item) => item.frameId === frame.frameId)) {
  const clean = sanitizeProductionText(frame.imagePrompt);
  if (countWords(clean) >= 40 && !hasProductionBlockedText(clean) && !hasInternalPromptLeak(clean)) return clean;
  return productionFramePrompt(ep, frame, Math.max(0, index));
}

export function renderVideoPrompt(ep: GhostEp, video: GhostEp["videos"][number]) {
  const clean = sanitizeProductionText(video.videoPrompt);
  if (countWords(clean) >= 70 && !hasProductionBlockedText(clean) && !hasInternalPromptLeak(clean)) return clean;
  return productionVideoPrompt(ep, video, Math.max(0, ep.videos.findIndex((item) => item.videoId === video.videoId)));
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
      title: sanitizeProductionText(frame.title),
      imagePrompt: renderImagePrompt(ep, frame)
    })),
    videos: ep.videos.map((video) => ({
      videoId: video.videoId,
      fromFrame: video.fromFrame,
      toFrame: video.toFrame,
      durationSec: video.durationSec,
      videoPrompt: renderVideoPrompt(ep, video),
      camera: sanitizeProductionText(video.camera),
      motion: sanitizeProductionText(video.motion),
      audio: sanitizeProductionText(video.audio),
      dialogue: video.dialogue,
      mood: sanitizeProductionText(video.mood)
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
  return safeFact(ep.episodeState?.mainProps || ep.episodeState?.props || ep.coreIdea?.hookMechanic || "", "cardboard box");
}

function locationForEp(ep: GhostEp) {
  return safeFact(ep.episodeState?.primaryLocation || ep.episodeState?.location || "", "bedroom");
}

function templateTone(ep: GhostEp) {
  const text = `${ep.templateId} ${ep.templateName} ${ep.category} ${ep.contentGoal}`.toLowerCase();
  if (/nightmare|horror|reality|breach|protocol|หลอน|สยอง/.test(text)) return "horror";
  if (/sigma/.test(text)) return "sigma";
  if (/review|affiliate/.test(text)) return "review";
  return "cute";
}

function beatFunctionForFrame(index: number, frameCount: number, tone: string) {
  if (tone === "horror" && frameCount >= 6) {
    return ["setup / normal reality", "anomaly / first wrong detail", "impossible evidence", "escalation / danger", "peak tension", "aftermath / unresolved ending"][index] ?? "aftermath / unresolved ending";
  }
  if (frameCount === 4) return ["setup", "problem", "escalation", "payoff"][index] ?? "payoff";
  if (frameCount === 3) return ["setup", "escalation", "payoff"][index] ?? "payoff";
  return ["setup", "problem", "escalation", "peak tension", "payoff", "aftermath"][index] ?? "payoff";
}

function endingRoleForBeat(index: number, frameCount: number, tone: string) {
  if (index === frameCount - 1) return tone === "horror" ? "unresolved evidence" : tone === "sigma" ? "deadpan recovery" : "absurd payoff";
  if (index === 0) return "opening";
  return "middle";
}

function normalizeBeat(beat: StoryBeat, ep: GhostEp, index: number, frameCount: number): StoryBeat {
  const facts = parseEpisodeFacts(ep);
  const tone = templateTone(ep);
  const tensionBase = tone === "horror" ? [2, 4, 7, 8, 9, 10] : tone === "sigma" ? [2, 4, 6, 7, 6, 5] : [1, 3, 5, 6, 7, 7];
  const beatFunction = beat.beatFunction || beat.function || beatFunctionForFrame(index, frameCount, tone);
  const last = index === frameCount - 1;
  let visibleEvent = beat.visibleEvent || beat.beat;
  let characterAction = beat.characterAction;
  let characterEmotion = beat.characterEmotion;
  let environmentChange = beat.environmentChange;
  let mainPropState = beat.mainPropState;
  let dialogueIntent = beat.dialogueIntent;

  if (!visibleEvent || hasProductionBlockedText(visibleEvent)) {
    if (tone === "horror") {
      const horrorEvents = [
        `Meow notices the ${facts.mainObject} is sealed shut even though it was open before`,
        `cold air leaks around the ${facts.mainObject} and the ${facts.secondaryObject} flickers unnaturally`,
        `the ${facts.mainObject} opens toward an impossible dark space instead of the normal room`,
        `Meow steps back as the ${facts.mainObject} pulls dust and sound inward`,
        `the impossible opening widens while Meow braces against the floor`,
        `the ${facts.mainObject} returns to normal but frost remains on the inside edge`
      ];
      visibleEvent = horrorEvents[index] ?? horrorEvents[horrorEvents.length - 1];
    } else if (tone === "sigma") {
      const sigmaEvents = [
        `Meow enters near the ${facts.mainObject} with a controlled cool pose`,
        `a tiny weakness appears when the ${facts.mainObject} refuses to cooperate`,
        `Meow struggles for one second but keeps his face completely calm`,
        `Meow recovers beside the ${facts.mainObject} as if the mistake was planned`
      ];
      visibleEvent = sigmaEvents[index] ?? sigmaEvents[sigmaEvents.length - 1];
    } else {
      const cuteEvents = [
        `Meow notices the ${facts.mainObject} and decides it deserves serious inspection`,
        `Meow tests the ${facts.mainObject} but cat logic rejects the obvious use`,
        `Meow changes strategy and tests the ${facts.mainObject} from a stranger angle`,
        `Meow settles proudly beside the ${facts.mainObject} as if he solved everything`
      ];
      visibleEvent = cuteEvents[index] ?? cuteEvents[cuteEvents.length - 1];
    }
  }

  if (!characterAction) characterAction = tone === "horror" ? (last ? `Meow freezes and stares at the frost on the ${facts.mainObject}` : `Meow approaches the ${facts.mainObject} with cautious steps`) : `Meow studies the ${facts.mainObject} with deliberate paw movements`;
  if (!characterEmotion) characterEmotion = tone === "horror" ? (last ? "silent dread" : index >= 2 ? "frozen shock" : "uneasy curiosity") : tone === "sigma" ? (last ? "deadpan dignity" : "controlled confidence") : (last ? "proud satisfaction" : "curious determination");
  if (!environmentChange) environmentChange = tone === "horror" ? (last ? "the room becomes quiet and unnaturally cold" : "the air grows colder and the shadows deepen") : "warm light stays consistent in the room";
  if (!mainPropState) mainPropState = tone === "horror" ? (last ? `${facts.mainObject} intact but frozen from the inside` : `${facts.mainObject} showing an impossible detail`) : `${facts.mainObject} visible and central to the action`;
  if (!dialogueIntent) dialogueIntent = tone === "horror" ? (last ? "quiet fear with no explanation" : index >= 2 ? "stunned disbelief" : "confused whisper") : tone === "sigma" ? (last ? "deadpan recovery" : "cool restraint") : (last ? "cute wrong conclusion" : "curious reaction");

  return {
    ...beat,
    beatFunction,
    function: beat.function || beatFunction,
    visibleEvent,
    beat: visibleEvent,
    characterAction,
    characterEmotion,
    environmentChange,
    mainPropState,
    dialogueIntent,
    tensionLevel: beat.tensionLevel || tensionBase[Math.min(index, tensionBase.length - 1)],
    endingRole: beat.endingRole || endingRoleForBeat(index, frameCount, tone)
  };
}

function catLogicPayoffObject(ep: GhostEp) {
  const source = `${ep.title} ${ep.story} ${mainObjectForEp(ep)}`.toLowerCase();
  if (/bed|cushion|pillow|ที่นอน|เบาะ|หมอน/.test(source)) return "the remote control beside it";
  if (/toy|ของเล่น|ball|ลูกบอล/.test(source)) return "the empty box";
  if (/feeder|food|อาหาร|ชาม/.test(source)) return "the paper bag near the bowl";
  if (/curtain|ม่าน|sunlight|แดด/.test(source)) return "the closed curtain";
  if (/basket|laundry|ตะกร้า/.test(source)) return "the laundry basket handle";
  if (/fan|พัดลม/.test(source)) return "the cool tile beside the fan";
  return "the cardboard box beside the furniture";
}

function safeFact(value: string, fallback: string) {
  const clean = sanitizeProductionText(value);
  return clean && !hasProductionBlockedText(clean) ? clean : fallback;
}

const objectCandidates = [
  ["mirror", /mirror|reflection|กระจก|เงาสะท้อน/i],
  ["curtain", /curtain|ม่าน/i],
  ["cardboard box", /cardboard box|box|กล่อง/i],
  ["laundry basket", /laundry basket|basket|ตะกร้า/i],
  ["electric fan", /electric fan|\bfan\b|พัดลม/i],
  ["food bowl", /food bowl|\bbowl\b|ชามอาหาร|ชาม/i],
  ["soft cat bed", /cat bed|soft bed|pet bed|bed|cushion|pillow|ที่นอน|เบาะ|หมอน/i],
  ["toy ball", /toy ball|\btoy\b|\bball\b|ของเล่น|ลูกบอล/i],
  ["wooden door", /wooden door|\bdoor\b|ประตู/i],
  ["remote control", /remote control|\bremote\b|รีโมท/i]
] as const;

function extractObjectFromText(text: string) {
  const matches = objectCandidates
    .map(([name, pattern], order) => {
      const match = text.match(pattern);
      return match?.index === undefined ? null : { name, index: match.index, order };
    })
    .filter((item): item is { name: typeof objectCandidates[number][0]; index: number; order: number } => Boolean(item))
    .sort((a, b) => a.index - b.index || a.order - b.order);
  return matches[0]?.name ?? "";
}

function objectPattern(objectName: string) {
  return objectCandidates.find(([name]) => name === objectName)?.[1] ?? new RegExp(objectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function detectedObjectsInText(text: string) {
  return objectCandidates.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function hasPrimaryObject(text: string, primaryObject: string) {
  return objectPattern(primaryObject).test(text);
}

function conflictingObjects(text: string, primaryObject: string) {
  return detectedObjectsInText(text).filter((objectName) => objectName !== primaryObject);
}

function fieldObjectConsistent(text: string, primaryObject: string) {
  return hasPrimaryObject(text, primaryObject) && conflictingObjects(text, primaryObject).length === 0;
}

function extractLocationFromText(text: string) {
  const candidates = [
    ["bedroom", /bedroom|bed room|ห้องนอน/i],
    ["living room", /living room|ห้องนั่งเล่น/i],
    ["kitchen", /kitchen|ครัว/i],
    ["old wooden hallway", /hallway|corridor|ทางเดิน/i],
    ["laundry corner", /laundry|ซักผ้า/i],
    ["sunny window corner", /window|curtain|หน้าต่าง|ม่าน/i]
  ] as const;
  return candidates.find(([, pattern]) => pattern.test(text))?.[0] ?? "";
}

function slugFact(value: string, fallback: string) {
  const slug = sanitizeProductionText(value)
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

export function parseEpisodeFacts(ep: GhostEp): EpisodeFacts {
  const source = [
    ep.title,
    ep.hook,
    ep.story,
    ep.coreIdea?.centralIdea,
    ep.coreIdea?.hookMechanic,
    ep.coreIdea?.payoffMechanic,
    ep.episodeState?.mainProps,
    ep.episodeState?.props,
    ep.episodeState?.location,
    ep.episodeState?.primaryLocation,
    ...(ep.storyBeats || []).map((beat) =>
      [
        beat.beat,
        beat.visibleEvent,
        beat.characterAction,
        beat.environmentChange,
        beat.mainPropState,
        beat.dialogueIntent,
        beat.endingRole,
      ]
        .filter(Boolean)
        .join(" "),
    ),
    ...ep.frames.map((frame) => `${frame.title} ${frame.imagePrompt}`),
    ...ep.videos.map((video) => video.videoPrompt)
  ].join(" ");
  const mainObject = safeFact(
    extractObjectFromText(`${ep.episodeState?.mainProps || ep.episodeState?.props || ""} ${source}`) || ep.episodeState?.mainProps || ep.episodeState?.props || "",
    "cardboard box"
  );
  const secondaryObject = safeFact(
    extractObjectFromText(source.replace(new RegExp(mainObject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "")),
    /curtain|window/i.test(mainObject) ? "morning sunlight" : "warm sunlight"
  );
  const location = safeFact(extractLocationFromText(source) || ep.episodeState?.primaryLocation || ep.episodeState?.location || "", "bedroom");
  const storyArchetype = safeFact(selectStoryArchetype(ep), "Daily Life");
  const hookType = /human|viewer|expect|มนุษย์|คน/i.test(source) ? "human_vs_cat" : /sound|voice|เสียง|horror|nightmare/i.test(source) ? "strange_evidence" : "cat_logic";
  const endingMechanic = slugFact(ep.coreIdea?.payoffMechanic || ep.storyBeats?.[ep.storyBeats.length - 1]?.beat || ep.videos[ep.videos.length - 1]?.videoPrompt || "", `${mainObject.replace(/\s+/g, "_")}_cat_payoff`);
  const catLogicType = /sleep|nap|นอน/i.test(source) ? "protect_sleep" : /box|กล่อง/i.test(source) ? "box_priority" : /sun|light|curtain|แดด|ม่าน/i.test(source) ? "control_light" : "cat_rules_win";
  return { mainObject, secondaryObject, location, hookType, endingMechanic, storyArchetype, catLogicType };
}

function archetypeStoryPlan(ep: GhostEp) {
  const object = mainObjectForEp(ep);
  const payoffObject = catLogicPayoffObject(ep);
  const archetype = selectStoryArchetype(ep);
  const plans: Record<string, { goal: string; obstacle: string; escalation: string; payoff: string; mechanic: string }> = {
    Investigation: {
      goal: `Meow investigates why ${object} seems suspicious`,
      obstacle: `${object} gives no clear answer and keeps attracting Meow's attention`,
      escalation: `Meow tests clues around ${object} with increasingly serious detective focus`,
      payoff: `Meow declares ${payoffObject} to be the real culprit`,
      mechanic: "cat detective misidentifies the real answer"
    },
    Mission: {
      goal: `Meow accepts a private mission to master ${object}`,
      obstacle: `${object} works by human rules that make no sense to Meow`,
      escalation: `Meow invents a stricter mission protocol and makes the task harder`,
      payoff: `Meow completes the mission by using ${payoffObject} instead`,
      mechanic: "mission success by wrong cat logic"
    },
    Training: {
      goal: `Meow trains to prove ${object} can be conquered`,
      obstacle: `the first training attempt makes ${object} look unbeatable`,
      escalation: `Meow repeats the training with more dramatic seriousness`,
      payoff: `Meow graduates himself after defeating ${payoffObject}`,
      mechanic: "self-awarded training victory"
    },
    Competition: {
      goal: `Meow competes against ${object} for control of the room`,
      obstacle: `${object} appears useful without trying, which annoys Meow`,
      escalation: `Meow raises the stakes and challenges the wrong target`,
      payoff: `Meow crowns ${payoffObject} as the winner`,
      mechanic: "competition judged by cat rules"
    },
    Mistake: {
      goal: `Meow tries to use ${object} correctly`,
      obstacle: `Meow misunderstands the purpose from the first touch`,
      escalation: `the mistake becomes more convincing the longer Meow commits to it`,
      payoff: `Meow treats ${payoffObject} as the intended solution`,
      mechanic: "mistake becomes the final logic"
    },
    Revenge: {
      goal: `Meow wants revenge on ${object} for a tiny personal insult`,
      obstacle: `${object} remains harmless, making the revenge feel absurd`,
      escalation: `Meow builds a dramatic revenge plan around small movements`,
      payoff: `Meow spares ${object} and punishes ${payoffObject} instead`,
      mechanic: "revenge redirects to the wrong object"
    },
    Collection: {
      goal: `Meow starts collecting evidence around ${object}`,
      obstacle: `every collected clue points to a different cat conclusion`,
      escalation: `Meow gathers more tiny items until the logic becomes ridiculous`,
      payoff: `Meow adds ${payoffObject} as the prized final artifact`,
      mechanic: "collection proves an absurd cat theory"
    },
    Experiment: {
      goal: `Meow runs a serious experiment on ${object}`,
      obstacle: `the first result contradicts what humans would expect`,
      escalation: `Meow repeats the experiment with stranger test conditions`,
      payoff: `Meow publishes the result by sitting beside ${payoffObject}`,
      mechanic: "fake science confirms cat logic"
    },
    "Fake Documentary": {
      goal: `Meow documents the natural behavior of ${object}`,
      obstacle: `${object} behaves normally, so Meow invents dramatic meaning`,
      escalation: `Meow observes closer like a wildlife narrator finding danger`,
      payoff: `the documentary concludes ${payoffObject} is the dominant species`,
      mechanic: "documentary overexplains a normal object"
    },
    Survival: {
      goal: `Meow tries to survive the mysterious presence of ${object}`,
      obstacle: `${object} blocks the safest route in Meow's imagination`,
      escalation: `Meow creates a survival strategy from tiny cautious movements`,
      payoff: `Meow survives by retreating to ${payoffObject}`,
      mechanic: "survival drama over a harmless object"
    },
    "Treasure Hunt": {
      goal: `Meow searches for hidden treasure connected to ${object}`,
      obstacle: `the treasure clue is too ordinary for human logic`,
      escalation: `Meow follows smaller and sillier clues around the same spot`,
      payoff: `Meow discovers ${payoffObject} and treats it like treasure`,
      mechanic: "treasure hunt ends on worthless treasure"
    },
    POV: {
      goal: `Meow tries to prove the viewer misunderstood ${object}`,
      obstacle: `the viewer expectation keeps pointing to the obvious use`,
      escalation: `Meow performs one more serious demonstration against that expectation`,
      payoff: `Meow reveals ${payoffObject} was the answer all along`,
      mechanic: "viewer expectation flips into cat behavior"
    },
    "Cute Horror": {
      goal: `Meow investigates the tiny scary feeling around ${object}`,
      obstacle: `the normal object seems to move only when Meow hesitates`,
      escalation: `Meow approaches with cute fear and overreads every detail`,
      payoff: `the scare resolves into ${payoffObject}, but Meow still mistrusts it`,
      mechanic: "small harmless scare stays cute"
    },
    "Daily Life": {
      goal: `Meow tries to make ${object} fit his daily routine`,
      obstacle: `the routine fails because cat logic refuses the obvious use`,
      escalation: `Meow changes the routine until the room makes less sense`,
      payoff: `Meow settles beside ${payoffObject} as if this was always normal`,
      mechanic: "daily routine bends around cat logic"
    }
  };
  return plans[archetype] ?? plans["Daily Life"];
}

function templateCoreIdeaFallback(ep: GhostEp) {
  const pack = templatePackForEp(ep);
  const object = mainObjectForEp(ep);
  const location = locationForEp(ep);
  if (pack.id === "cute-daily-life") {
    const plan = archetypeStoryPlan(ep);
    return `${selectStoryArchetype(ep)} in ${location}: ${plan.goal}, but ${plan.obstacle}; ${plan.payoff}.`;
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
    const plan = archetypeStoryPlan(ep);
    if (role === "hook") return `Observation: ${selectStoryArchetype(ep)} starts in ${location} when ${object} catches Meow's attention.`;
    if (role === "goal") return `Goal: ${plan.goal}.`;
    if (role === "obstacle") return `Obstacle: ${plan.obstacle}.`;
    if (role === "escalation") return `Escalation: ${plan.escalation}.`;
    return `Payoff: ${plan.payoff}.`;
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
  const archetype = selectStoryArchetype(ep);
  const archetypePlan = archetypeStoryPlan({ ...ep, storyArchetype: archetype });
  const templateLogic = ep.coreIdea?.templateLogic || `${pack.id}: ${pack.logicLayer || `${pack.coreConflict}; ${pack.payoffMechanic}`}`;
  return {
    ...defaultCoreIdea(),
    ...(ep.coreIdea ?? {}),
    centralIdea: ep.coreIdea?.centralIdea || templateCoreIdeaFallback(ep),
    coreConflict: ep.coreIdea?.coreConflict || pack.coreConflict,
    hookMechanic: ep.coreIdea?.hookMechanic || ep.hook || `${archetype}: ${archetypePlan.goal}`,
    payoffMechanic: ep.coreIdea?.payoffMechanic || ep.story.split(/[.!?。！？]/).filter(Boolean).pop()?.trim() || archetypePlan.mechanic || pack.payoffMechanic,
    emotionTarget: ep.coreIdea?.emotionTarget || ep.episodeState?.emotionProgression || "curiosity -> reaction",
    noveltyAngle: ep.coreIdea?.noveltyAngle || `${pack.id} ${archetype} angle: ${archetypePlan.mechanic || pack.qualitySignals?.join(" -> ") || pack.payoffMechanic}`,
    templateLogic
  };
}

export function generateStoryBeats(ep: GhostEp): StoryBeat[] {
  const frameCount = Math.max(1, ep.frames.length);
  const existing = Array.isArray(ep.storyBeats)
    ? ep.storyBeats.filter((beat) => (beat.beat || beat.visibleEvent || beat.beatFunction || "").trim())
    : [];
  const functions = beatFunctions(ep, frameCount);
  const baseBeat = (beat: StoryBeat, index: number) => normalizeBeat(beat, ep, index, frameCount);
  if (existing.length >= frameCount) {
    return existing.slice(0, frameCount).map((beat, index) => baseBeat({
      ...beat,
      role: beat.role || depthRoleForIndex(index, frameCount),
      function: functions[index] || beat.function,
      beat: beat.beat || templateDepthBeatText(ep, depthRoleForIndex(index, frameCount), functions[index] || beat.function, index, frameCount)
    }, index));
  }
  return Array.from({ length: frameCount }, (_, index) => ({
    beatId: `beat${index + 1}`,
    role: depthRoleForIndex(index, frameCount),
    function: functions[index] || `connector ${index + 1}`,
    beat: existing[index]?.beat || templateDepthBeatText(ep, depthRoleForIndex(index, frameCount), functions[index] || "story beat", index, frameCount)
  })).map(baseBeat);
}

export function generateEpisodeState(ep: GhostEp): EpisodeState {
  const old = { ...defaultEpisodeState(), ...(ep.episodeState ?? {}) };
  const firstFrameText = stripAssemblySections(ep.frames[0]?.imagePrompt ?? "");
  const detectedLocation = extractLocationFromText(`${old.primaryLocation} ${old.location} ${old.continuityAnchor} ${firstFrameText}`);
  const detectedObject = extractObjectFromText(`${old.mainProps} ${old.props} ${firstFrameText} ${ep.story} ${ep.hook}`);
  const location = safeFact(old.primaryLocation || old.location || detectedLocation, "bedroom");
  const lighting = safeFact(old.lightingStyle || old.lighting, "warm morning sunlight");
  const props = safeFact(old.mainProps || old.props || detectedObject, "cardboard box");
  const camera = safeFact(old.cameraLanguage || old.camera, "low cinematic camera");
  return {
    ...old,
    primaryLocation: location,
    location,
    timeOfDay: old.timeOfDay || "morning",
    lightingStyle: lighting,
    mainProps: props,
    continuityAnchor: old.continuityAnchor || `${location}, ${props}`,
    characterStartPosition: old.characterStartPosition || `near the ${props}`,
    characterEndPosition: old.characterEndPosition || `settled beside the ${props}`,
    lighting,
    props,
    voice: old.voice || ep.voiceProfile?.preset || ep.characterName,
    camera,
    cameraLanguage: camera,
    environmentAudio: old.environmentAudio || "soft room tone and tiny paw steps",
    visualAnchor: old.visualAnchor || props || firstFrameText,
    emotionProgression: old.emotionProgression || ep.coreIdea?.emotionTarget || "sleepy curiosity to proud confidence"
  };
}

export function generateContinuityAnchor(ep: GhostEp): ContinuityAnchor {
  const state = ep.episodeState ?? defaultEpisodeState();
  return {
    location: safeFact(state.primaryLocation || state.location, "bedroom"),
    mainProp: safeFact(state.mainProps || state.props, "cardboard box"),
    lighting: safeFact(state.lightingStyle || state.lighting, "warm morning sunlight"),
    timeOfDay: state.timeOfDay || "morning",
    cameraStyle: safeFact(state.cameraLanguage || state.camera, "low cinematic camera"),
    emotionArc: safeFact(state.emotionProgression || ep.coreIdea?.emotionTarget || "", "sleepy curiosity to proud confidence")
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
    frames: ep.frames.map((frame, index) => {
      const beat = ep.storyBeats?.[index];
      return {
      frameId: frame.frameId,
      title: sanitizeProductionText(beat?.visibleEvent || frame.title || beat?.beatFunction || `Frame ${index + 1}`),
      imagePrompt: productionFramePrompt(ep, frame, index)
    };
    }),
    visualStates
  };
}

function videoStateText(state?: VisualState) {
  return state ? `${state.locationLayout}; ${state.characterPosition}; ${state.actionState}; ${state.emotionState}` : "";
}

export function generateVideos(ep: GhostEp): GhostEp {
  const videos = ep.videos.map((video, index): VideoPrompt => {
    const fromState = visualStateForFrame(ep, video.fromFrame);
    const toState = visualStateForFrame(ep, video.toFrame);
    void fromState;
    void toState;
    const prompt = productionVideoPrompt(ep, video, index);
    return {
      videoId: video.videoId,
      fromFrame: video.fromFrame,
      toFrame: video.toFrame,
      durationSec: video.durationSec,
      videoPrompt: prompt,
      camera: video.camera || ep.episodeState?.cameraLanguage || ep.episodeState?.camera || "",
      audio: video.audio || ep.episodeState?.environmentAudio || "",
      motion: video.motion || prompt,
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
  const roleChecks = {
    hook: /hook|observation|find|notice|catches|appears|starts|เจอ|เห็น|สังเกต/i.test(text),
    goal: /goal|wants|tries|needs|mission|decide|investigate|prove|search|train|test|ต้องการ|พยายาม|เป้าหมาย/i.test(text),
    obstacle: /obstacle|problem|challenge|blocks|fails|misunderstands|rejects|contradicts|unbeatable|ปัญหา|อุปสรรค/i.test(text),
    escalation: /escalation|escalate|becomes|harder|increasingly|repeats|raises|closer|responds|overthinks|ทวี|มากขึ้น|หนักขึ้น/i.test(text),
    payoff: /payoff|result|finally|chooses|declares|completes|discovers|concludes|settles|ends|เฉลย|ผลลัพธ์|สุดท้าย/i.test(text)
  };
  const roleHits = storyDepthRoles.filter((role) => roleChecks[role]);
  const shallow = /observation\s*[-→>]+\s*action\s*[-→>]+\s*end|action\s*[-→>]+\s*end|look\w*\s+.*walk\w*\s+.*sit\w*\s+.*end|fan\s+.*walk\s+.*sit|basket\s+.*look\s+.*squeeze\s+.*sit/i.test(text);
  return {
    score: scoreFromRatio((roleHits.length / storyDepthRoles.length) * (shallow ? 0.5 : 1)),
    missingRoles: storyDepthRoles.filter((role) => !roleChecks[role])
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
      beat: `${previous.visibleEvent || previous.beat}. ${beat.visibleEvent || beat.beat || coreIdea?.centralIdea || "The same event continues with a visible consequence."}`
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
      const transition = conciseCreativeVideoPrompt(ep, video, ep.videos.findIndex((item) => item.videoId === video.videoId));
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

function dialogueFromBeat(ep: GhostEp, beat: StoryBeat | undefined, index: number) {
  if (ep.language === "No Dialogue") return "";
  const tone = templateTone(ep);
  const normalized = beat ? normalizeBeat(beat, ep, index, ep.storyBeats?.length || ep.frames.length) : undefined;
  const tension = normalized?.tensionLevel ?? index + 2;
  if (tone === "horror") {
    if (tension >= 9) return index >= ep.videos.length - 1 ? "...มันกลับมาปิดเอง" : "อย่าดึงฉันเข้าไป...";
    if (tension >= 7) return "ข้างนอก... ไม่ใช่ที่เดิมแล้ว";
    if (tension >= 4) return "เดี๋ยวนะ... ทำไมมันเย็นแบบนี้";
    return "ประตูนี้... เมื่อกี้ยังเปิดอยู่";
  }
  if (tone === "sigma") {
    if (index >= ep.videos.length - 1) return "ตั้งใจอยู่แล้ว";
    if (tension >= 6) return "ไม่มีอะไร... คุมได้";
    return "ดูไว้";
  }
  if (tone === "review") {
    if (index >= ep.videos.length - 1) return "แบบนี้ใช้ได้จริงนะ";
    return tension >= 5 ? "ลองอีกทีให้ชัด ๆ" : "อันนี้ช่วยได้ไหมนะ";
  }
  if (index >= ep.videos.length - 1) return "อันนี้แหละ ถูกต้องที่สุด";
  return tension >= 5 ? "เดี๋ยวนะ... แบบนี้น่าสนใจกว่า" : "มันต้องตรวจให้แน่ใจก่อน";
}

function ensureUniqueDialogue(videos: VideoPrompt[]) {
  const seen = new Map<string, number>();
  return videos.map((video) => {
    const key = video.dialogue.trim();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (!key || count === 0) return video;
    return { ...video, dialogue: key.includes("...") ? key.replace("...", "… อีกแล้ว...") : `${key}... อีกแล้ว` };
  });
}

export function rewriteDialogue(ep: GhostEp): GhostEp {
  const videos = ep.videos.map((video, index) => {
    const targetBeat = ep.storyBeats?.[Math.min(index + 1, (ep.storyBeats?.length ?? 1) - 1)] ?? ep.storyBeats?.[index];
    const replacement = dialogueFromBeat(ep, targetBeat, index + 1);
    return { ...video, dialogue: replacement };
  });
  return { ...ep, videos: ensureUniqueDialogue(videos) };
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

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countWords(text: string) {
  return wordCount(text);
}

function promptDetailScore(ep: GhostEp) {
  const frameScores = ep.frames.map((frame) => {
    const text = leanPrompt(frame.imagePrompt);
    const count = countWords(text);
    const hasLeak = hasInternalPromptLeak(text) || hasProductionBlockedText(text);
    const lengthScore = count >= 40 && count <= 90 ? 1 : count >= 28 ? 0.65 : 0.25;
    const detailSignals = [
      /meow|cat|แมว/i,
      /look|stare|stand|sit|walk|inspect|approach|tap|จ้อง|ยืน|นั่ง|เดิน|สำรวจ/i,
      /curious|nervous|proud|serious|fear|cute|สงสัย|กลัว|ภูมิใจ|จริงจัง/i,
      /room|kitchen|hall|bedroom|sink|floor|ห้อง|ครัว|ทางเดิน/i,
      /close|wide|medium|camera|composition|framing|shot|มุมกล้อง/i,
      /light|shadow|warm|moon|cinematic|แสง|เงา/i
    ].filter((pattern) => pattern.test(text)).length / 6;
    return scoreFromRatio((lengthScore * 0.65) + (detailSignals * 0.35) - (hasLeak ? 0.5 : 0));
  });
  const videoScores = ep.videos.map((video) => {
    const text = leanPrompt(video.videoPrompt);
    const count = countWords(text);
    const hasLeak = hasInternalPromptLeak(text) || hasProductionBlockedText(text);
    const lengthScore = count >= 70 && count <= 150 ? 1 : count >= 45 ? 0.65 : 0.25;
    const detailSignals = [
      /start|begins|initial|จาก|เริ่ม/i,
      /transition|moves|approaches|circles|turns|เดิน|ขยับ|เข้าใกล้/i,
      /end|finally|ends|จบ|สุดท้าย/i,
      /camera|pan|tilt|dolly|zoom|shot|กล้อง/i,
      /prop|box|bowl|door|bed|fan|object|กล่อง|ชาม|ประตู|พัดลม/i,
      /audio|sound|creak|wind|hum|เสียง/i,
      /nervous|curious|tense|proud|emotion|สงสัย|กลัว|ตึงเครียด/i
    ].filter((pattern) => pattern.test(text)).length / 7;
    return scoreFromRatio((lengthScore * 0.65) + (detailSignals * 0.35) - (hasLeak ? 0.5 : 0));
  });
  const scores = [...frameScores, ...videoScores];
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
}

function productionLeakCount(ep: GhostEp) {
  const fields = [
    ep.story,
    ep.hook,
    ep.caption,
    ep.soundEffects,
    ...ep.frames.map((frame) => `${frame.title} ${frame.imagePrompt}`),
    ...ep.videos.map((video) => `${video.videoPrompt} ${video.camera} ${video.motion} ${video.audio} ${video.mood}`)
  ];
  return fields.filter((field) => hasProductionBlockedText(field)).length;
}

function storyBeatAlignmentScore(ep: GhostEp) {
  const beats = ep.storyBeats ?? [];
  if (!beats.length) return 0;
  const storyScore = scoreFromRatio(beats.filter((beat) => tokenOverlapRatio(ep.story, `${beat.visibleEvent} ${beat.characterAction} ${beat.mainPropState}`) >= 0.08).length / beats.length);
  const frameScore = scoreFromRatio(ep.frames.filter((frame, index) => {
    const beat = beats[index];
    return beat && tokenOverlapRatio(`${frame.title} ${frame.imagePrompt}`, `${beat.visibleEvent} ${beat.characterAction} ${beat.characterEmotion} ${beat.mainPropState}`) >= 0.08;
  }).length / Math.max(1, ep.frames.length));
  const videoScore = scoreFromRatio(ep.videos.filter((video, index) => {
    const fromBeat = beats[index];
    const toBeat = beats[index + 1];
    return fromBeat && toBeat && tokenOverlapRatio(video.videoPrompt, `${fromBeat.visibleEvent} ${toBeat.visibleEvent} ${fromBeat.mainPropState} ${toBeat.mainPropState}`) >= 0.06;
  }).length / Math.max(1, ep.videos.length));
  return Math.round((storyScore + frameScore + videoScore) / 3);
}

function hookBeatConsistencyScore(ep: GhostEp) {
  const firstText = `${ep.storyBeats?.[0]?.visibleEvent} ${ep.storyBeats?.[1]?.visibleEvent} ${ep.frames[0]?.imagePrompt} ${ep.videos[0]?.videoPrompt}`;
  const overlap = tokenOverlapRatio(ep.hook, firstText);
  const facts = parseEpisodeFacts(ep);
  const objectHit = ep.hook.toLowerCase().includes(facts.mainObject.toLowerCase()) || firstText.toLowerCase().includes(facts.mainObject.toLowerCase());
  return scoreFromRatio(Math.min(1, overlap * 3 + (objectHit ? 0.35 : 0)));
}

function dialogueBeatConsistencyScore(ep: GhostEp) {
  if (!ep.videos.length) return ep.language === "No Dialogue" ? 100 : 0;
  const dialogues = ep.videos.map((video) => video.dialogue.trim()).filter(Boolean);
  const repeats = dialogues.length - new Set(dialogues).size;
  const tone = templateTone(ep);
  const ending = ep.videos[ep.videos.length - 1]?.dialogue ?? "";
  const badHorrorEnding = tone === "horror" && /(อ๋อ|แบบนี้เอง|ตลก|ฮ่า|สบาย|ชนะ|ตั้งใจ)/i.test(ending);
  const aligned = ep.videos.filter((video, index) => {
    const beat = ep.storyBeats?.[Math.min(index + 1, (ep.storyBeats?.length ?? 1) - 1)] ?? ep.storyBeats?.[index];
    if (!beat) return false;
    const target = dialogueFromBeat(ep, beat, index + 1);
    return tokenOverlapRatio(video.dialogue, `${target} ${beat.dialogueIntent} ${beat.characterEmotion}`) >= 0.05 || video.dialogue.trim() === target.trim();
  }).length;
  return scoreFromRatio((aligned / ep.videos.length) - (repeats * 0.25) - (badHorrorEnding ? 0.5 : 0));
}

function templateToneConsistencyScore(ep: GhostEp) {
  const text = `${ep.story} ${ep.videos.map((video) => video.dialogue).join(" ")}`.toLowerCase();
  const tone = templateTone(ep);
  if (tone === "horror") {
    const horrorSignals = /(cold|frost|silent|dread|impossible|shadow|dark|wrong|fear|หลอน|กลัว|เย็น|เงา|ผิดปกติ)/i.test(text);
    const comedyLeak = /(cute|proud|ชนะ|อ๋อ|แบบนี้เอง|mission|cat logic|สบาย|ตลก|ฮ่า)/i.test(text);
    return scoreFromRatio((horrorSignals ? 0.8 : 0.35) - (comedyLeak ? 0.5 : 0));
  }
  if (tone === "sigma") return scoreFromRatio(/cool|deadpan|confident|calm|ตั้งใจ|คุมได้/i.test(text) ? 0.95 : 0.65);
  return scoreFromRatio(/cute|proud|absurd|funny|cozy|ภูมิใจ|ถูกต้อง|น่ารัก/i.test(text) ? 0.95 : 0.7);
}

function endingMechanicScore(ep: GhostEp) {
  const tone = templateTone(ep);
  const lastBeat = ep.storyBeats?.[ep.storyBeats.length - 1];
  const ending = `${lastBeat?.visibleEvent} ${lastBeat?.endingRole} ${lastBeat?.mainPropState} ${ep.story} ${ep.videos[ep.videos.length - 1]?.dialogue}`.toLowerCase();
  if (tone === "horror") {
    return scoreFromRatio(/unresolved|evidence|frost|silent|dread|contradiction|normal again|กลับมาปิด|เย็น|เงียบ/i.test(ending) && !/(อ๋อ|ชนะ|ตั้งใจ|funny|proud)/i.test(ending) ? 0.95 : 0.45);
  }
  if (tone === "sigma") return scoreFromRatio(/deadpan|recovery|intentional|ตั้งใจ|คุมได้/i.test(ending) ? 0.95 : 0.65);
  return scoreFromRatio(/absurd|proud|chooses|settles|wrong|ถูกต้อง|ภูมิใจ/i.test(ending) ? 0.95 : 0.65);
}

function productionFieldsForObject(ep: GhostEp) {
  return [
    ep.title,
    ep.hook,
    ep.story,
    ep.caption,
    ...ep.frames.map((frame) => `${frame.title} ${frame.imagePrompt}`),
    ...ep.videos.map((video) => `${video.videoPrompt} ${video.camera} ${video.motion} ${video.audio} ${video.dialogue} ${video.mood}`)
  ].map((field) => sanitizeProductionText(field));
}

function objectConsistencyDetails(ep: GhostEp, primaryObject = parseEpisodeFacts(ep).mainObject) {
  const fields = productionFieldsForObject(ep);
  const failures = fields.filter((field) => !fieldObjectConsistent(field, primaryObject));
  return { primaryObject, fields, failures };
}

function objectConsistencyScore(ep: GhostEp) {
  const { fields, failures } = objectConsistencyDetails(ep);
  return scoreFromRatio(fields.length ? (fields.length - failures.length) / fields.length : 0);
}

function crossFieldConsistencyScore(ep: GhostEp) {
  const facts = parseEpisodeFacts(ep);
  const titleHookStory = [ep.title, ep.hook, ep.story, ep.caption].map((field) => sanitizeProductionText(field));
  const frameVideo = [
    ...ep.frames.map((frame) => sanitizeProductionText(`${frame.title} ${frame.imagePrompt}`)),
    ...ep.videos.map((video) => sanitizeProductionText(`${video.videoPrompt} ${video.dialogue}`))
  ];
  const topLevelOk = titleHookStory.every((field) => fieldObjectConsistent(field, facts.mainObject));
  const mediaOk = frameVideo.every((field) => fieldObjectConsistent(field, facts.mainObject));
  const hookStoryOverlap = tokenOverlapRatio(`${ep.title} ${ep.hook} ${ep.caption}`, ep.story) >= 0.08;
  return scoreFromRatio((topLevelOk ? 0.4 : 0) + (mediaOk ? 0.4 : 0) + (hookStoryOverlap ? 0.2 : 0));
}

function repeatedSentenceKeys(text: string) {
  return text
    .split(/[.!?。！？\n]+/)
    .map((sentence) => sanitizeProductionText(sentence).toLowerCase())
    .map((sentence) => sentence.split(/\s+/).slice(0, 5).join(" "))
    .filter((sentence) => countWords(sentence) >= 3);
}

function repetitionFailures(ep: GhostEp) {
  const keys = [
    ...repeatedSentenceKeys(ep.story),
    ...ep.videos.flatMap((video) => repeatedSentenceKeys(video.videoPrompt)),
    ...ep.videos.map((video) => sanitizeProductionText(video.dialogue).toLowerCase()).filter(Boolean)
  ];
  const counts = new Map<string, number>();
  keys.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 2).map(([key]) => key);
}

function repetitionScore(ep: GhostEp) {
  return scoreFromRatio(repetitionFailures(ep).length ? 0.35 : 1);
}

export function qualityGateV3Failures(ep: GhostEp) {
  const review = runQualityReview(ep);
  return [
    review.objectConsistencyScore < QUALITY_GATE_V3_MIN_SCORE ? `objectConsistencyScore ${review.objectConsistencyScore}` : "",
    review.crossFieldConsistencyScore < QUALITY_GATE_V3_MIN_SCORE ? `crossFieldConsistencyScore ${review.crossFieldConsistencyScore}` : "",
    review.repetitionScore < QUALITY_GATE_V3_MIN_SCORE ? `repetitionScore ${review.repetitionScore}` : ""
  ].filter(Boolean);
}

export function passesQualityGateV3(ep: GhostEp) {
  return qualityGateV3Failures(ep).length === 0;
}

function markQualityGateFailed(ep: GhostEp): GhostEp {
  const review = runQualityReview(ep);
  const failures = qualityGateV3Failures({ ...ep, qualityReview: review });
  return {
    ...ep,
    title: QUALITY_GATE_V3_FAILED_MESSAGE,
    story: QUALITY_GATE_V3_FAILED_MESSAGE,
    hook: QUALITY_GATE_V3_FAILED_MESSAGE,
    caption: QUALITY_GATE_V3_FAILED_MESSAGE,
    frames: [],
    videos: [],
    voiceScript: "",
    soundEffects: "",
    hashtags: [],
    qualityReview: {
      ...review,
      passed: false,
      notes: `${QUALITY_GATE_V3_FAILED_MESSAGE}: ${failures.join(", ")}`
    },
    parseHealth: {
      score: 0,
      parsedFields: [],
      missing: failures,
      status: "warning"
    }
  };
}

export function enforceQualityGateV3(ep: GhostEp): GhostEp {
  let next = sanitizeProductionOutput(ep);
  if (passesQualityGateV3(next)) return next;
  for (let attempt = 0; attempt < QUALITY_GATE_V3_MAX_REGENERATION_ATTEMPTS; attempt += 1) {
    next = sanitizeProductionOutput(rewriteForQuality(next));
    if (passesQualityGateV3(next)) {
      const review = runQualityReview(next);
      next.qualityReview = {
        ...review,
        notes: `${review.notes} Quality Gate V3 passed after ${attempt + 1} regeneration attempt(s).`
      };
      return next;
    }
  }
  return markQualityGateFailed(next);
}

function titleForPrimaryObject(ep: GhostEp, primaryObject: string) {
  const tone = templateTone(ep);
  if (tone === "horror") return `Meow and the Wrong ${primaryObject}`;
  if (tone === "sigma") return `Meow Stays Cool Beside the ${primaryObject}`;
  return `Meow's ${primaryObject} Decision`;
}

function captionForPrimaryObject(ep: GhostEp, primaryObject: string) {
  const tone = templateTone(ep);
  if (tone === "horror") return `Meow finds one impossible clue inside the ${primaryObject}, and the room never explains it.`;
  if (tone === "sigma") return `Meow refuses to admit the ${primaryObject} won for even one second.`;
  return `Meow studies the ${primaryObject}, rejects human logic, and makes the most Meow decision possible.`;
}

function rewriteRepetition(ep: GhostEp): GhostEp {
  if (!repetitionFailures(ep).length) return ep;
  const facts = parseEpisodeFacts(ep);
  const story = productionStory(ep, facts);
  const videos = ep.videos.map((video, index) => ({
    ...video,
    videoPrompt: productionVideoPrompt({ ...ep, story }, video, index, facts)
  }));
  return { ...ep, story, videos };
}

function enforceSingleObjectLock(ep: GhostEp): GhostEp {
  const facts = parseEpisodeFacts(ep);
  const primaryObject = facts.mainObject;
  const lockedFacts = { ...facts, mainObject: primaryObject };
  const base: GhostEp = { ...ep, episodeFacts: lockedFacts };
  const story = fieldObjectConsistent(base.story, primaryObject) && !needsStoryRewrite(base.story)
    ? sanitizeProductionText(base.story)
    : productionStory(base, lockedFacts);
  const hookCandidate = sanitizeProductionText(base.hook);
  const hook = fieldObjectConsistent(hookCandidate, primaryObject)
    ? hookCandidate
    : `Meow notices the ${primaryObject} in the ${lockedFacts.location} and realizes the whole moment depends on it.`;
  const titleCandidate = sanitizeProductionText(base.title);
  const title = fieldObjectConsistent(titleCandidate, primaryObject) ? titleCandidate : titleForPrimaryObject(base, primaryObject);
  const captionCandidate = sanitizeProductionText(base.caption);
  const caption = fieldObjectConsistent(captionCandidate, primaryObject) ? captionCandidate : captionForPrimaryObject(base, primaryObject);
  const frames = base.frames.map((frame, index) => {
    const text = `${frame.title} ${frame.imagePrompt}`;
    const imagePrompt = fieldObjectConsistent(text, primaryObject) ? renderImagePrompt({ ...base, story, hook, episodeFacts: lockedFacts }, frame, index) : productionFramePrompt({ ...base, story, hook, episodeFacts: lockedFacts }, frame, index, lockedFacts);
    const titleText = fieldObjectConsistent(frame.title, primaryObject) ? sanitizeProductionText(frame.title) : `${frame.frameId} - ${primaryObject}`;
    return { frameId: frame.frameId, title: titleText, imagePrompt };
  });
  const frameLockedEp = { ...base, title, story, hook, caption, frames, episodeFacts: lockedFacts };
  const videos = base.videos.map((video, index) => {
    const text = `${video.videoPrompt} ${video.camera} ${video.motion} ${video.audio} ${video.dialogue} ${video.mood}`;
    const videoPrompt = fieldObjectConsistent(text, primaryObject) ? renderVideoPrompt(frameLockedEp, video) : productionVideoPrompt(frameLockedEp, video, index, lockedFacts);
    return {
      ...video,
      videoPrompt,
      motion: fieldObjectConsistent(video.motion, primaryObject) ? sanitizeProductionText(video.motion) : `Meow moves around the ${primaryObject} with a clear continuous action.`,
      mood: sanitizeProductionText(video.mood)
    };
  });
  return rewriteRepetition({ ...frameLockedEp, videos, voiceScript: buildVoiceScriptFromDialogue(videos, "", ep.language) });
}

function enforcePromptLength(ep: GhostEp): GhostEp {
  const facts = parseEpisodeFacts(ep);
  const frames = ep.frames.map((frame, index) => {
    const clean = leanPrompt(frame.imagePrompt);
    return {
      ...frame,
      imagePrompt: countWords(clean) < 40 || hasInternalPromptLeak(clean) || hasProductionBlockedText(clean) ? productionFramePrompt(ep, frame, index, facts) : clean
    };
  });
  const frameFixedEp = { ...ep, frames };
  const videos = ep.videos.map((video, index) => {
    const clean = leanPrompt(video.videoPrompt);
    return {
      ...video,
      videoPrompt: countWords(clean) < 70 || hasInternalPromptLeak(clean) || hasProductionBlockedText(clean) ? productionVideoPrompt(frameFixedEp, video, index, facts) : clean,
      motion: sanitizeProductionText(video.motion?.trim() || clean || `Meow moves with careful curiosity around the ${facts.mainObject}.`)
    };
  });
  return { ...frameFixedEp, videos };
}

function isAbstractStory(story: string) {
  const text = story.toLowerCase();
  return /^(observation|problem|payoff)\b|observation\s*[-→>\/]+|problem\s*[-→>\/]+|payoff\s*[-→>\/]+/i.test(text) || countWords(story) < 35;
}

function storyHasNarrativeShape(story: string) {
  const text = story.toLowerCase();
  const beginning = /morning|night|inside|opens|places|starts|appears|notices|ยาม|ตอน|ในห้อง|เริ่ม|เห็น/.test(text);
  const action = /walk|move|pull|tap|sniff|test|grab|circle|steps|เดิน|ดึง|แตะ|ขยับ|สำรวจ/.test(text);
  const reaction = /react|eyes|expression|suspicious|surprised|proud|sleepy|annoyed|สงสัย|ตกใจ|ภูมิใจ|ง่วง/.test(text);
  const ending = /end|finally|settles|claims|returns|leaves|wins|victorious|สุดท้าย|จบ|กลับ|ชนะ/.test(text);
  return beginning && action && reaction && ending;
}

function needsStoryRewrite(story: string) {
  const clean = sanitizeProductionText(story);
  return countWords(clean) < 50 || hasProductionBlockedText(story) || !storyHasNarrativeShape(clean);
}

function expandFramePrompt(prompt: string, ep: GhostEp, frame: GhostEp["frames"][number], index: number) {
  const base = leanPrompt(prompt);
  if (countWords(base) >= 40 && !hasInternalPromptLeak(base) && !hasProductionBlockedText(base)) return base;
  return productionFramePrompt(ep, frame, index);
}

function expandVideoPrompt(prompt: string, ep: GhostEp, video: GhostEp["videos"][number]) {
  const base = leanPrompt(prompt);
  if (countWords(base) >= 70 && !hasInternalPromptLeak(base) && !hasProductionBlockedText(base)) return base;
  return productionVideoPrompt(ep, video, ep.videos.findIndex((item) => item.videoId === video.videoId));
}

function coreIdeaConsistencyScore(ep: GhostEp) {
  const idea = [
    ep.coreIdea?.centralIdea,
    ep.coreIdea?.coreConflict,
    ep.coreIdea?.hookMechanic,
    ep.coreIdea?.payoffMechanic,
    mainObjectForEp(ep)
  ].join(" ");
  const content = [
    ep.story,
    ep.hook,
    ...ep.frames.map((frame) => `${frame.title} ${frame.imagePrompt}`),
    ...ep.videos.map((video) => `${video.videoPrompt} ${video.dialogue}`)
  ].join(" ");
  return scoreFromRatio(Math.min(1, tokenOverlapRatio(idea, content) * 2.5));
}

function productionStory(ep: GhostEp, facts = parseEpisodeFacts(ep)) {
  const beats = ep.storyBeats?.length ? ep.storyBeats.map((beat, index) => normalizeBeat(beat, ep, index, ep.storyBeats?.length || ep.frames.length)) : [];
  if (beats.length) {
    return beats.map((beat, index) => {
      const opener = index === 0 ? `Inside the ${facts.location}, ` : "";
      return `${opener}${beat.visibleEvent}. ${beat.characterAction}, showing ${beat.characterEmotion}, while ${beat.environmentChange}.`;
    }).join(" ");
  }
  if (templateTone(ep) === "horror") {
    return [
      `Inside the ${facts.location}, Meow notices the ${facts.mainObject} sitting unnaturally still while the air around it turns cold.`,
      `He steps closer, ears low, and watches the ${facts.secondaryObject} flicker as if something outside the room has touched it.`,
      `The ${facts.mainObject} reveals an impossible detail that does not belong in the normal world, and Meow freezes in silent shock.`,
      `The room loses its ordinary sound, the shadows tighten around the floor, and Meow backs away without understanding what opened in front of him.`,
      `By the end, the ${facts.mainObject} looks normal again, but a trace of impossible evidence remains, leaving Meow staring in dread.`
    ].join(" ");
  }
  return [
    `Morning light settles inside the ${facts.location} while a human leaves the ${facts.mainObject} in the perfect spot for normal use.`,
    `Meow notices it immediately, narrows his sleepy eyes, and decides the object has challenged the comfort of the room.`,
      `He walks closer with careful little steps, sniffs the edge, taps it once, and reacts as if the ${facts.mainObject} has confirmed his suspicion.`,
    `The situation becomes more serious when Meow tries a second method, changes his angle, and turns a tiny everyday problem into a dramatic cat decision.`,
    `By the end, Meow chooses his own solution, claims the space with quiet confidence, and leaves the human logic behind like it never mattered.`
  ].join(" ");
}

function productionFramePrompt(ep: GhostEp, frame: GhostEp["frames"][number], index: number, facts = parseEpisodeFacts(ep)) {
  const beat = ep.storyBeats?.[index] ? normalizeBeat(ep.storyBeats[index], ep, index, ep.storyBeats.length) : undefined;
  if (beat) {
    return `Meow in the ${facts.location}, ${beat.visibleEvent}. ${beat.characterAction}, with ${beat.characterEmotion} clearly visible on his face and body posture. The ${facts.mainObject} is shown as ${beat.mainPropState}, while ${beat.environmentChange}. Balanced vertical 9:16 composition, medium cinematic camera framing, detailed environment, expressive orange tabby fur, polished Pixar-quality 3D animation, controlled lighting that matches the scene tone.`;
  }
  const actions = [
    `Meow sitting near the ${facts.mainObject}, staring at it with suspicious sleepy eyes`,
    `Meow stepping closer to the ${facts.mainObject}, one paw lifted as he studies the edge`,
    `Meow testing the ${facts.mainObject} with a careful tap while his ears tilt forward`,
    `Meow reacting dramatically beside the ${facts.mainObject}, tail raised and face determined`,
    `Meow claiming the area near the ${facts.secondaryObject}, looking proud and completely serious`,
    `Meow resting after solving the problem his own way, calm expression and fluffy orange fur glowing`
  ];
  const action = actions[index] ?? actions[actions.length - 1];
  return `${action} inside a detailed ${facts.location}, the ${facts.secondaryObject} visible in the background, clear character emotion, warm natural lighting, soft shadows, balanced vertical 9:16 composition, medium cinematic camera framing, polished Pixar-quality 3D animation, high quality fur detail, cozy production-ready visual mood.`;
}

function productionVideoPrompt(ep: GhostEp, video: GhostEp["videos"][number], index: number, facts = parseEpisodeFacts(ep)) {
  const fromBeat = ep.storyBeats?.[index] ? normalizeBeat(ep.storyBeats[index], ep, index, ep.storyBeats.length) : undefined;
  const toBeat = ep.storyBeats?.[index + 1] ? normalizeBeat(ep.storyBeats[index + 1], ep, index + 1, ep.storyBeats.length) : undefined;
  if (fromBeat && toBeat) {
    return `Meow begins in the ${facts.location} as ${fromBeat.visibleEvent}, carrying ${fromBeat.characterEmotion} in his posture. He moves through the scene with ${fromBeat.characterAction}, while the camera glides low beside him and the air shifts from ${fromBeat.environmentChange} to ${toBeat.environmentChange}. The ${facts.mainObject} changes from ${fromBeat.mainPropState} to ${toBeat.mainPropState}. By the final moment, ${toBeat.visibleEvent}, and Meow's emotion rises into ${toBeat.characterEmotion}. Detailed environmental audio, cinematic motion, Pixar-quality 3D animation, vertical 9:16.`;
  }
  const actions = [
    `Meow slowly walks toward the ${facts.mainObject} while keeping his eyes locked on it, ears tilted forward with curious suspicion.`,
    `Meow circles the ${facts.mainObject} once, sniffs the edge, and taps it with one paw as if testing a secret rule.`,
    `Meow changes strategy, moves around the ${facts.secondaryObject}, and reacts with growing determination as the room stays quiet.`,
    `Meow makes the final cat-logic decision, claims the space beside the ${facts.mainObject}, and settles with a proud sleepy expression.`,
    `Meow finishes the tiny mission by relaxing near the ${facts.secondaryObject}, calm and victorious while the human solution is ignored.`
  ];
  const action = actions[index] ?? actions[actions.length - 1];
  return `${action} The camera begins at a low medium angle in the ${facts.location}, then glides smoothly beside Meow as his body movement becomes more deliberate. Warm light falls across his orange striped fur, small dust particles drift in the air, and the ${facts.secondaryObject} remains visible as environmental context. The motion builds from cautious curiosity into confident cat logic, ending with Meow holding the frame in a polished Pixar-quality 3D animation style, vertical 9:16, cinematic lighting.`;
}

function conciseCreativeFramePrompt(ep: GhostEp, frame: GhostEp["frames"][number], index: number) {
  const existing = leanPrompt(frame.imagePrompt);
  if (existing && !hasInternalPromptLeak(existing) && countWords(existing) >= 40) return existing;
  const pack = templatePackForEp(ep);
  const object = mainObjectForEp(ep);
  const location = locationForEp(ep);
  if (pack.id === "cute-daily-life") {
    const base = index === ep.frames.length - 1
      ? `Meow staring intensely at ${catLogicPayoffObject(ep)} with serious cat logic`
      : `Meow inspecting ${object} with focused curiosity and a cute thoughtful expression`;
    return expandFramePrompt(base, ep, frame, index);
  }
  if (pack.id === "sigma-cat") {
    const base = index === ep.frames.length - 1
      ? "Meow recovering from a tiny failure with a calm deadpan expression"
      : "Meow posing confidently while a tiny ridiculous challenge appears nearby";
    return expandFramePrompt(base, ep, frame, index);
  }
  if (pack.id === "nightmare-protocol") {
    const base = index === ep.frames.length - 1
      ? "Meow frozen in fear as the unanswered evidence remains in the room"
      : `Meow cautiously staring at ${object} as impossible evidence becomes visible`;
    return expandFramePrompt(base, ep, frame, index);
  }
  if (pack.id === "review" || pack.id === "affiliate") {
    const base = index === ep.frames.length - 1
      ? `Meow showing the practical result after testing ${object}`
      : `Meow naturally testing ${object} with clear visible action`;
    return expandFramePrompt(base, ep, frame, index);
  }
  return expandFramePrompt(`Meow focused on ${object} with a clear expressive pose in ${location}`, ep, frame, index);
}

function conciseCreativeVideoPrompt(ep: GhostEp, video: GhostEp["videos"][number], index: number) {
  const existing = leanPrompt(video.videoPrompt);
  if (existing && !hasInternalPromptLeak(existing) && countWords(existing) >= 70) return existing;
  const pack = templatePackForEp(ep);
  const object = mainObjectForEp(ep);
  if (pack.id === "cute-daily-life") {
    const base = index === ep.videos.length - 1
      ? `Meow circles ${catLogicPayoffObject(ep)}, taps it with one paw, then tries to use it with total seriousness`
      : `Meow approaches ${object}, sniffs it, and studies it like a confusing human invention`;
    return expandVideoPrompt(base, ep, video);
  }
  if (pack.id === "sigma-cat") {
    const base = index === ep.videos.length - 1
      ? "Meow pauses, regains composure, and walks away like the mishap was intentional"
      : "Meow moves forward confidently until a tiny obstacle interrupts the cool pose";
    return expandVideoPrompt(base, ep, video);
  }
  if (pack.id === "nightmare-protocol") {
    const base = index === ep.videos.length - 1
      ? "Meow backs away slowly as the evidence remains and the room falls unnaturally quiet"
      : `Meow moves closer to ${object} while tracking the impossible evidence with nervous focus`;
    return expandVideoPrompt(base, ep, video);
  }
  if (pack.id === "review" || pack.id === "affiliate") {
    const base = index === ep.videos.length - 1
      ? `Meow finishes the test and shows the useful result without hard selling`
      : `Meow demonstrates ${object} through one simple visible action`;
    return expandVideoPrompt(base, ep, video);
  }
  return expandVideoPrompt(`Meow moves naturally around ${object} while staying focused`, ep, video);
}

export function runQualityReview(ep: GhostEp): QualityReview {
  const storyDepthScore = validateStoryDepth(ep.storyBeats ?? []).score;
  const promptDetailScoreValue = promptDetailScore(ep);
  const leakPenalty = productionLeakCount(ep) ? 0.45 : 0;
  const storyQualityScore = scoreFromRatio(
    Math.max(0, (isAbstractStory(ep.story) || needsStoryRewrite(ep.story) ? 0 : 0.45) - leakPenalty) +
    (Math.min(1, countWords(ep.story) / 80) * 0.35) +
    ((storyDepthScore / 100) * 0.2)
  );
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
  const storyBeatAlignmentScoreValue = storyBeatAlignmentScore(ep);
  const hookBeatConsistencyScoreValue = hookBeatConsistencyScore(ep);
  const dialogueBeatConsistencyScoreValue = dialogueBeatConsistencyScore(ep);
  const templateToneConsistencyScoreValue = templateToneConsistencyScore(ep);
  const endingMechanicScoreValue = endingMechanicScore(ep);
  const objectConsistencyScoreValue = objectConsistencyScore(ep);
  const crossFieldConsistencyScoreValue = crossFieldConsistencyScore(ep);
  const repetitionScoreValue = repetitionScore(ep);
  const voiceContinuityScore = scoreFromRatio(
    (ep.voiceProfile && Object.values(ep.voiceProfile).filter(Boolean).length >= 8 ? 0.35 : 0) +
    (ep.voiceScript === expectedVoiceScript ? 0.45 : 0) +
    (ep.dialogueOutline?.length === ep.videos.length ? 0.1 : 0) +
    (dialogueConsistencyScore / 100 * 0.1)
  );
  const noveltyScore = scoreNovelty(ep);
  const templateMatchScore = Math.round((qualitySignalScore(ep) + coreIdeaConsistencyScore(ep)) / 2);
  const anchorText = ep.characterAnchor?.toLowerCase() ?? "";
  const characterConsistencyScore = scoreFromRatio(
    (anchorText.length > 40 ? 0.4 : 0) +
    (ep.frames.every((frame) => frame.frameId.trim() && frame.title.trim() && frame.imagePrompt.trim()) ? 0.3 : 0) +
    (ep.videos.every((video) => video.fromFrame.trim() && video.toFrame.trim() && video.videoPrompt.trim()) ? 0.3 : 0)
  );
  const scores = [storyQualityScore, storyDepthScore, promptDetailScoreValue, storyBeatContinuityScore, visualContinuityScore, videoContinuityScore, dialogueConsistencyScore, voiceContinuityScore, storyBeatAlignmentScoreValue, hookBeatConsistencyScoreValue, dialogueBeatConsistencyScoreValue, templateToneConsistencyScoreValue, endingMechanicScoreValue, objectConsistencyScoreValue, crossFieldConsistencyScoreValue, repetitionScoreValue, noveltyScore, templateMatchScore, characterConsistencyScore];
  const episodeCompletenessScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const threshold = 85;
  const passed = episodeCompletenessScore >= threshold;
  return {
    storyQualityScore,
    storyDepthScore,
    promptDetailScore: promptDetailScoreValue,
    storyBeatContinuityScore,
    visualContinuityScore,
    videoContinuityScore,
    dialogueConsistencyScore,
    voiceContinuityScore,
    storyBeatAlignmentScore: storyBeatAlignmentScoreValue,
    hookBeatConsistencyScore: hookBeatConsistencyScoreValue,
    dialogueBeatConsistencyScore: dialogueBeatConsistencyScoreValue,
    templateToneConsistencyScore: templateToneConsistencyScoreValue,
    endingMechanicScore: endingMechanicScoreValue,
    objectConsistencyScore: objectConsistencyScoreValue,
    crossFieldConsistencyScore: crossFieldConsistencyScoreValue,
    repetitionScore: repetitionScoreValue,
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
  const storyBeats = Array.from({ length: frameCount }, (_, index) => normalizeBeat({
    beatId: `beat${index + 1}`,
    role: depthRoleForIndex(index, frameCount),
    function: functions[index] || `connector ${index + 1}`,
    beat: templateDepthBeatText(ep, depthRoleForIndex(index, frameCount), functions[index] || "story beat", index, frameCount)
  }, ep, index, frameCount));
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
      dialogue: ep.language === "No Dialogue" ? "" : video.dialogue
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
    story: productionStory({ ...ep, storyBeats }),
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
    if (review.storyQualityScore >= 85 && review.promptDetailScore >= 85 && review.storyBeatAlignmentScore >= 85 && review.hookBeatConsistencyScore >= 85 && review.dialogueBeatConsistencyScore >= 85 && review.templateToneConsistencyScore >= 85 && review.endingMechanicScore >= 85 && review.objectConsistencyScore >= 85 && review.crossFieldConsistencyScore >= 85 && review.repetitionScore >= 85 && review.templateMatchScore >= 80 && review.noveltyScore >= 80 && payoffScore >= 80 && continuityScore >= 80 && depthScore >= 80 && !isAbstractStory(next.story)) {
      next.qualityReview = {
        ...review,
        passed: review.episodeCompletenessScore >= review.threshold,
        notes: `Code quality review passed. payoffScore=${payoffScore}; continuityScore=${continuityScore}; depthScore=${depthScore}; promptDetailScore=${review.promptDetailScore}.`
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
    passed: finalReview.storyQualityScore >= 85 && finalReview.promptDetailScore >= 85 && finalReview.storyBeatAlignmentScore >= 85 && finalReview.hookBeatConsistencyScore >= 85 && finalReview.dialogueBeatConsistencyScore >= 85 && finalReview.templateToneConsistencyScore >= 85 && finalReview.endingMechanicScore >= 85 && finalReview.objectConsistencyScore >= 85 && finalReview.crossFieldConsistencyScore >= 85 && finalReview.repetitionScore >= 85 && finalReview.templateMatchScore >= 80 && finalReview.noveltyScore >= 80 && payoffScore >= 80 && continuityScore >= 80 && validateStoryDepth(next.storyBeats ?? []).score >= 80 && !isAbstractStory(next.story),
    notes: `Code quality filter applied. payoffScore=${payoffScore}; continuityScore=${continuityScore}; depthScore=${validateStoryDepth(next.storyBeats ?? []).score}; promptDetailScore=${finalReview.promptDetailScore}.`
  };
  return next;
}

export function sanitizeGeneratedEp(ep: GhostEp): GhostEp {
  return enforceQualityGateV3(ep);
}

export function sanitizeProductionOutput(ep: GhostEp): GhostEp {
  const facts = parseEpisodeFacts(ep);
  const lengthChecked = enforcePromptLength({ ...ep, episodeFacts: facts });
  const story = needsStoryRewrite(lengthChecked.story) ? productionStory(lengthChecked, facts) : sanitizeProductionText(lengthChecked.story);
  const firstBeat = lengthChecked.storyBeats?.[0] ? normalizeBeat(lengthChecked.storyBeats[0], lengthChecked, 0, lengthChecked.storyBeats.length) : undefined;
  const hookCandidate = sanitizeProductionText(lengthChecked.hook);
  const hook = hasProductionBlockedText(lengthChecked.hook) || !hookCandidate || (firstBeat && tokenOverlapRatio(hookCandidate, `${firstBeat.visibleEvent} ${firstBeat.mainPropState}`) < 0.05)
    ? `Meow notices the ${facts.mainObject} in the ${facts.location} and realizes something is wrong.`
    : hookCandidate;
  const cleanFrames = lengthChecked.frames.map((frame) => ({
    frameId: frame.frameId,
    title: leanPrompt(frame.title),
    imagePrompt: renderImagePrompt({ ...lengthChecked, story, hook, episodeFacts: facts }, frame)
  }));
  const cleanVideos = ensureUniqueDialogue(lengthChecked.videos.map((video, index) => {
    const targetBeat = lengthChecked.storyBeats?.[Math.min(index + 1, (lengthChecked.storyBeats?.length ?? 1) - 1)] ?? lengthChecked.storyBeats?.[index];
    return {
      videoId: video.videoId || `V${index + 1}`,
      fromFrame: video.fromFrame || `F${index + 1}`,
      toFrame: video.toFrame || `F${index + 2}`,
      durationSec: Math.max(1, Number(video.durationSec || 8)),
      videoPrompt: renderVideoPrompt({ ...lengthChecked, frames: cleanFrames, story, hook, episodeFacts: facts }, video),
      camera: sanitizeProductionText(video.camera) || `low cinematic camera following Meow inside the ${facts.location}`,
      motion: sanitizeProductionText(video.motion) || `Meow moves carefully around the ${facts.mainObject} with growing confidence`,
      audio: sanitizeProductionText(video.audio) || `soft room tone, tiny paw steps, gentle fabric rustle`,
      dialogue: ep.language === "No Dialogue" ? "" : dialogueFromBeat({ ...lengthChecked, language: ep.language }, targetBeat, index + 1),
      mood: sanitizeProductionText(video.mood) || (templateTone(lengthChecked) === "horror" ? "tense, mysterious, dreadful" : "curious, cozy, lightly dramatic")
    };
  }));
  const next: GhostEp = {
    ...ep,
    story,
    hook,
    storyArchetype: selectStoryArchetype(ep),
    episodeFacts: facts,
    frames: cleanFrames,
    videos: cleanVideos,
    durationSec: cleanVideos.reduce((sum, video) => sum + video.durationSec, 0) || ep.durationSec,
    voiceScript: buildVoiceScriptFromDialogue(cleanVideos, "", ep.language),
    soundEffects: sanitizeProductionText(ep.soundEffects),
    caption: sanitizeProductionText(ep.caption),
    hashtags: Array.isArray(ep.hashtags) ? ep.hashtags.map((tag) => String(tag).trim()).filter(Boolean) : []
  };
  const locked = enforceSingleObjectLock(next);
  locked.qualityReview = runQualityReview(locked);
  return leanEpOutput(locked);
}

export function outputJSON(ep: GhostEp): GhostEp {
  return ep;
}

export function runInternalGeneratorPipeline(ep: GhostEp): GhostEp {
  let next: GhostEp = {
    ...ep,
    storyArchetype: selectStoryArchetype(ep),
    coreIdea: generateCoreIdea(ep),
    characterAnchor: ep.characterAnchor || buildCharacterAnchorFromAsset(getCharacterAsset(ep.characterId))
  };
  next.storyBeats = rewriteStoryBeats(generateStoryBeats(next), next.coreIdea);
  next.story = productionStory(next);
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
  next = sanitizeGeneratedEp(next);
  next.parseHealth = calculateParseHealth(next);
  return outputJSON(next);
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
  ep.storyArchetype = stringValue(source, ["storyArchetype", "story_archetype", "archetype"]);
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
    return jsonObjects
      .map((item, index) => applySelection(mapJsonEp(item, index, date), selection))
      .filter(passesQualityGateV3);
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
  }).filter(passesQualityGateV3);
}
