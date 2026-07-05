import { promises as fs } from "fs";
import path from "path";
import { checklistForEp, createChecklistFromParts } from "./checklist";
import { buildCharacterPromptCapsule, getCharacterAsset } from "./character-assets";
import { FLOW_VIDEO_DURATION_SEC, buildVoiceManifest, ensureEpLocks, renderImagePrompt, renderVideoPrompt, voiceScriptFromManifest } from "./ep-generator";
import type { CharacterProfile, EpStatus, GhostCharacter, GhostEp, GhostTemplate, Idea, IdeaMemory, ParseHealth, Project, Settings, SpokenLanguage } from "./types";

const root = process.cwd();
const dataDir = path.join(root, "data");
const publicDir = path.join(root, "public");

export const paths = {
  dataDir,
  settings: path.join(dataDir, "settings.json"),
  character: path.join(dataDir, "character.json"),
  characters: path.join(dataDir, "characters.json"),
  templates: path.join(dataDir, "templates.json"),
  ideas: path.join(dataDir, "ideas.json"),
  projects: path.join(dataDir, "projects.json"),
  epHistory: path.join(dataDir, "ep-history.json"),
  episodeMemory: path.join(dataDir, "episode_memory.json"),
  ideaMemory: path.join(dataDir, "idea-memory.json"),
  dailyBatches: path.join(dataDir, "daily-batches")
};

export const defaultCharacters: GhostCharacter[] = [
  {
    id: "meow",
    name: "Meow",
    type: "cat",
    description: "fluffy orange tabby cat with orange striped fur, cute expressive face, high quality fur",
    visualStyle: "Pixar-quality 3D animation, cinematic lighting, commercial quality visuals",
    promptCapsule: "Meow, fluffy orange tabby with orange stripes, round expressive face, large dark eyes, pink nose, cream muzzle and paws, black collar, plain round gold pendant, Pixar-quality 3D.",
    personality: ["cute", "funny", "absurd", "expressive"],
    rules: [
      "always keep the same orange tabby cat identity",
      "never change fur color",
      "never change species",
      "never turn into a human"
    ],
    negativeRules: ["no subtitles", "no caption overlay", "no text overlay", "no watermark", "no logo"],
    imageUrl: "",
    referenceImages: [],
    expressions: [],
    poses: [],
    voicePreset: "Thai Boy",
    defaultLanguage: "Thai",
    languagePreference: "Thai",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true
  }
];

export const defaultTemplates: GhostTemplate[] = [
  {
    id: "cute-daily-life",
    name: "Cute Daily Life",
    category: "Comedy",
    goal: "Create a cute and easy-to-understand short video",
    structure: ["hook", "simple action", "cute reaction", "small twist"],
    bestFor: ["cat", "dog", "mascot"],
    defaultFrameCount: 3,
    defaultVideoCount: 2,
    tone: "cute, funny, simple",
    languageSupport: ["Thai", "English", "Japanese", "Korean", "Chinese", "No Dialogue"],
    isDefault: true
  },
  {
    id: "cat-logic",
    name: "Cat Logic",
    category: "Cat Logic",
    goal: "Create absurd logic from a cat perspective",
    structure: ["hook", "cat misunderstanding", "confident reaction", "absurd twist"],
    bestFor: ["cat", "mascot"],
    defaultFrameCount: 3,
    defaultVideoCount: 2,
    tone: "funny, absurd, confident",
    isDefault: false
  },
  {
    id: "sigma-cat",
    name: "Sigma Cat",
    category: "Sigma Cat",
    goal: "Create a cool character moment with a funny break",
    structure: ["cool entrance", "silent confidence", "unexpected weakness", "recovery"],
    bestFor: ["cat", "mascot"],
    defaultFrameCount: 3,
    defaultVideoCount: 2,
    tone: "cool, meme, deadpan",
    isDefault: false
  },
  {
    id: "horror-comedy",
    name: "Horror Comedy",
    category: "Horror Comedy",
    goal: "Create a scary setup that becomes cute or ridiculous",
    structure: ["creepy hook", "suspense", "Meow reaction", "funny reveal"],
    bestFor: ["cat", "dog", "mascot"],
    defaultFrameCount: 4,
    defaultVideoCount: 3,
    tone: "cute horror, funny, safe",
    isDefault: false
  },
  {
    id: "fake-documentary",
    name: "Fake Documentary",
    category: "Fake Documentary",
    goal: "Create a mock documentary about a tiny absurd event",
    structure: ["serious narration", "tiny subject", "over-analysis", "ridiculous conclusion"],
    bestFor: ["cat", "dog", "mascot", "object"],
    defaultFrameCount: 4,
    defaultVideoCount: 3,
    tone: "dry, cinematic, absurd",
    isDefault: false
  },
  {
    id: "pov",
    name: "POV",
    category: "POV",
    goal: "Create a first-person relatable short scene",
    structure: ["POV hook", "relatable problem", "character action", "quick payoff"],
    bestFor: ["cat", "dog", "mascot", "human"],
    defaultFrameCount: 3,
    defaultVideoCount: 2,
    tone: "relatable, quick, funny",
    isDefault: false
  },
  {
    id: "product-review",
    name: "Product Review",
    category: "Review",
    goal: "Create an entertaining review without hard selling",
    structure: ["problem hook", "product encounter", "honest reaction", "soft takeaway"],
    bestFor: ["cat", "dog", "mascot", "creator"],
    defaultFrameCount: 3,
    defaultVideoCount: 2,
    tone: "helpful, playful, honest",
    isDefault: false
  },
  {
    id: "problem-solution",
    name: "Problem Solution",
    category: "Educational",
    goal: "Show a clear everyday problem and simple solution",
    structure: ["pain point", "failed attempt", "solution", "small result"],
    bestFor: ["cat", "dog", "mascot", "creator"],
    defaultFrameCount: 3,
    defaultVideoCount: 2,
    tone: "clear, useful, light",
    isDefault: false
  },
  {
    id: "affiliate-soft-sell",
    name: "Affiliate Soft Sell",
    category: "Affiliate",
    goal: "Create fun-first affiliate content with a soft CTA",
    structure: ["3-second hook", "problem", "character reaction", "product as solution", "soft CTA"],
    bestFor: ["cat", "dog", "mascot", "creator"],
    defaultFrameCount: 3,
    defaultVideoCount: 2,
    tone: "fun first, helpful, soft sell",
    isDefault: false
  },
  {
    id: "top-3-product-reasons",
    name: "Top 3 Product Reasons",
    category: "Affiliate",
    goal: "Give three simple reasons to consider a product",
    structure: ["hook", "reason 1", "reason 2", "reason 3", "soft CTA"],
    bestFor: ["cat", "dog", "mascot", "creator"],
    defaultFrameCount: 4,
    defaultVideoCount: 3,
    tone: "useful, fast, soft sell",
    isDefault: false
  }
];

export const defaultIdeaMemory: IdeaMemory = {
  categories: {
    Comedy: 0,
    "Horror Comedy": 0,
    "Sigma Cat": 0,
    "Cat Logic": 0,
    "Fake Documentary": 0,
    "Fake Educational": 0,
    POV: 0,
    Meme: 0,
    "Random Absurd Humor": 0
  },
  recentKeywords: [],
  recentTwists: []
};

export type EpisodeMemoryEntry = {
  epId: string;
  title: string;
  centralIdea: string;
  storyBeats: string[];
  coreConflict: string;
  hookMechanic: string;
  endingMechanic: string;
  location: string;
  mainObject: string;
  template: string;
  createdAt: string;
};

export const defaultProject: Project = {
  id: "default-project",
  name: "Default Project",
  description: "Default local-first GhostFactory project",
  settings: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const defaultIdeas: Idea[] = [
  "Cat vs Cockroach",
  "Detective Cat",
  "Sigma Cat",
  "Morning Routine",
  "Product Review",
  "Cute Daily Life"
].map((title, index) => ({
  id: `idea-${index + 1}`,
  title,
  category: index === 4 ? "Affiliate" : "Comedy",
  tags: title.toLowerCase().split(/\s+/),
  note: "",
  usedCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

export const defaultAnalytics = {
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  revenue: 0,
  affiliateClicks: 0
};

export const defaultParseHealth: ParseHealth = {
  score: 0,
  parsedFields: [],
  missing: [],
  status: "warning"
};

const defaultEpisodeState = {
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

const defaultCoreIdea = {
  centralIdea: "",
  coreConflict: "",
  hookMechanic: "",
  payoffMechanic: "",
  emotionTarget: "",
  noveltyAngle: "",
  templateLogic: ""
};

const defaultCharacterAnchor = buildCharacterPromptCapsule({ asset: getCharacterAsset("meow") });

const defaultVoiceProfile = {
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

const defaultContinuitySelfCheck = {
  storyContinuityScore: 0,
  frameContinuityScore: 0,
  videoContinuityScore: 0,
  voiceContinuityScore: 0,
  threshold: 85,
  passed: false,
  notes: ""
};

const defaultQualityReview = {
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

export const defaultChecklist = {
  frames: {},
  videos: {},
  editedDone: false,
  postedDone: false
};

async function ensureParent(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      await writeJsonFile(filePath, fallback);
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T) {
  await ensureParent(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function getSettings() {
  const defaults: Settings = {
    daily24sCount: 3,
    daily16sCount: 3,
    creditMode: "normal",
    autoImageGeneration: false,
    aiMode: "manual",
    defaultLanguage: "thai",
    outputRoot: "output",
    duplicateSimilarityThreshold: 0.72
  };
  const settings = await readJsonFile<Settings>(paths.settings, defaults);
  return { ...defaults, ...settings };
}

export async function saveSettings(settings: Settings) {
  await writeJsonFile(paths.settings, settings);
  return settings;
}

export async function getCharacter() {
  const defaults: CharacterProfile = {
    name: "Meow",
    description: "",
    characterLock: "Meow, fluffy orange tabby cat, orange striped fur, cute expressive face, high quality fur, Pixar-quality 3D animation",
    forbiddenChanges: ["ห้ามเปลี่ยนสีขน", "ห้ามเปลี่ยนชนิดสัตว์", "ห้ามทำให้กลายเป็นคน"],
    globalNegativeRules: ["no subtitles", "no caption overlay", "no text overlay", "no watermark", "no logo", "no background music by default", "vertical 9:16", "commercial quality visuals"],
    visualStyle: "",
    contentStyle: [],
    rules: []
  };
  const character = await readJsonFile<CharacterProfile>(paths.character, defaults);
  return {
    ...defaults,
    ...character,
    forbiddenChanges: character.forbiddenChanges ?? defaults.forbiddenChanges,
    globalNegativeRules: character.globalNegativeRules ?? defaults.globalNegativeRules
  };
}

function normalizeCharacters(items: GhostCharacter[]) {
  const list = items.length ? items : defaultCharacters;
  const hasDefault = list.some((item) => item.isDefault);
  return list.map((item, index) => ({
    ...item,
    id: item.id || safeSegment(item.name.toLowerCase()) || `character-${index + 1}`,
    personality: Array.isArray(item.personality) ? item.personality : [],
    rules: Array.isArray(item.rules) ? item.rules : [],
    negativeRules: Array.isArray(item.negativeRules) ? item.negativeRules : [],
    imagePath: item.imagePath ?? "",
    imageUrl: item.imagePath || item.imageUrl || "",
    referenceImages: Array.isArray(item.referenceImages) ? item.referenceImages : [],
    expressions: Array.isArray(item.expressions) ? item.expressions : [],
    poses: Array.isArray(item.poses) ? item.poses : [],
    voicePreset: item.voicePreset ?? "Thai Boy",
    defaultLanguage: item.defaultLanguage ?? item.languagePreference ?? "Thai",
    languagePreference: item.languagePreference ?? "Thai",
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? new Date().toISOString(),
    isDefault: hasDefault ? Boolean(item.isDefault) : index === 0
  }));
}

function imageExtension(mime: string) {
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "png";
}

async function storeCharacterImage(character: GhostCharacter) {
  if (!character.imageUrl?.startsWith("data:image/")) return character;
  const match = character.imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return character;
  const ext = imageExtension(match[1]);
  const safeId = safeSegment(character.id || character.name || `character-${Date.now()}`);
  const uploadDir = path.join(publicDir, "uploads", "characters");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, `${safeId}.${ext}`), Buffer.from(match[2], "base64"));
  return {
    ...character,
    imagePath: `/uploads/characters/${safeId}.${ext}`,
    imageUrl: `/uploads/characters/${safeId}.${ext}`
  };
}

async function storeCharacterImages(characters: GhostCharacter[]) {
  return Promise.all(characters.map(storeCharacterImage));
}

function serializeCharactersForDisk(characters: GhostCharacter[]) {
  return characters.map((character) => {
    if (!character.imagePath) return character;
    const { imageUrl, ...rest } = character;
    return rest;
  });
}

function normalizeTemplates(items: GhostTemplate[]) {
  const list = items.length ? items : defaultTemplates;
  const hasDefault = list.some((item) => item.isDefault);
  return list.map((item, index) => ({
    ...item,
    id: item.id || safeSegment(item.name.toLowerCase()) || `template-${index + 1}`,
    structure: Array.isArray(item.structure) ? item.structure : [],
    bestFor: Array.isArray(item.bestFor) ? item.bestFor : [],
    languageSupport: Array.isArray(item.languageSupport) ? item.languageSupport : ["Thai", "English", "Japanese", "Korean", "Chinese", "No Dialogue"] as SpokenLanguage[],
    defaultFrameCount: Number(item.defaultFrameCount || 3),
    defaultVideoCount: Number(item.defaultVideoCount || 2),
    isDefault: hasDefault ? Boolean(item.isDefault) : index === 0
  }));
}

export async function getCharacters() {
  const characters = await readJsonFile<GhostCharacter[]>(paths.characters, defaultCharacters);
  const normalized = normalizeCharacters(characters);
  const migrated = await storeCharacterImages(normalized);
  if (JSON.stringify(migrated) !== JSON.stringify(normalized)) {
    await writeJsonFile(paths.characters, serializeCharactersForDisk(migrated));
  }
  return migrated;
}

export async function saveCharacters(characters: GhostCharacter[]) {
  const next = await storeCharacterImages(normalizeCharacters(characters));
  await writeJsonFile(paths.characters, serializeCharactersForDisk(next));
  return next;
}

export async function getCharacterById(id: string) {
  const characters = await getCharacters();
  return characters.find((character) => character.id === id) ?? null;
}

export async function getDefaultCharacter() {
  const characters = await getCharacters();
  return characters.find((character) => character.isDefault) ?? characters[0] ?? defaultCharacters[0];
}

export async function getTemplates() {
  const templates = await readJsonFile<GhostTemplate[]>(paths.templates, defaultTemplates);
  return normalizeTemplates(templates);
}

export async function saveTemplates(templates: GhostTemplate[]) {
  const next = normalizeTemplates(templates);
  await writeJsonFile(paths.templates, next);
  return next;
}

export async function getTemplateById(id: string) {
  const templates = await getTemplates();
  return templates.find((template) => template.id === id) ?? null;
}

export async function getDefaultTemplate() {
  const templates = await getTemplates();
  return templates.find((template) => template.isDefault) ?? templates[0] ?? defaultTemplates[0];
}

function normalizeIdeas(items: Idea[]) {
  return (items.length ? items : defaultIdeas).map((item, index) => ({
    ...item,
    id: item.id || `idea-${index + 1}`,
    title: item.title || "Untitled Idea",
    category: item.category || "Uncategorized",
    tags: Array.isArray(item.tags) ? item.tags : [],
    note: item.note ?? "",
    usedCount: Number(item.usedCount || 0),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  }));
}

export async function getIdeas() {
  const ideas = await readJsonFile<Idea[]>(paths.ideas, defaultIdeas);
  return normalizeIdeas(ideas);
}

export async function saveIdeas(ideas: Idea[]) {
  const next = normalizeIdeas(ideas);
  await writeJsonFile(paths.ideas, next);
  return next;
}

export async function incrementIdeaUsage(id: string) {
  const ideas = await getIdeas();
  const next = ideas.map((idea) => idea.id === id ? { ...idea, usedCount: idea.usedCount + 1, updatedAt: new Date().toISOString() } : idea);
  await saveIdeas(next);
  return next.find((idea) => idea.id === id) ?? null;
}

function normalizeProjects(items: Project[]) {
  return (items.length ? items : [defaultProject]).map((item, index) => ({
    ...item,
    id: item.id || (index === 0 ? "default-project" : `project-${index + 1}`),
    name: item.name || "Default Project",
    description: item.description ?? "",
    settings: item.settings ?? {},
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  }));
}

export async function getProjects() {
  const projects = await readJsonFile<Project[]>(paths.projects, [defaultProject]);
  return normalizeProjects(projects);
}

export async function saveProjects(projects: Project[]) {
  const next = normalizeProjects(projects);
  await writeJsonFile(paths.projects, next);
  return next;
}

export async function getEpHistory() {
  const history = await readJsonFile<GhostEp[]>(paths.epHistory, []);
  return history.map(normalizeStoredEp);
}

export async function saveEpHistory(eps: GhostEp[]) {
  await writeJsonFile(paths.epHistory, eps.map(normalizeStoredEp));
}

export async function appendEpToHistory(ep: GhostEp) {
  const history = await getEpHistory();
  const next = [ep, ...history.filter((item) => item.id !== ep.id)];
  await saveEpHistory(next);
  return ep;
}

export async function saveDailyBatch(date: string, batch: unknown) {
  await writeJsonFile(path.join(paths.dailyBatches, `${date}.json`), batch);
}

export async function getIdeaMemory() {
  const memory = await readJsonFile<IdeaMemory>(paths.ideaMemory, defaultIdeaMemory);
  return {
    categories: { ...defaultIdeaMemory.categories, ...(memory.categories ?? {}) },
    recentKeywords: Array.isArray(memory.recentKeywords) ? memory.recentKeywords : [],
    recentTwists: Array.isArray(memory.recentTwists) ? memory.recentTwists : []
  };
}

export async function saveIdeaMemory(memory: IdeaMemory) {
  await writeJsonFile(paths.ideaMemory, {
    categories: memory.categories,
    recentKeywords: memory.recentKeywords.slice(0, 100),
    recentTwists: memory.recentTwists.slice(0, 100)
  });
}

export async function getEpisodeMemory() {
  return readJsonFile<EpisodeMemoryEntry[]>(paths.episodeMemory, []);
}

export async function saveEpisodeMemory(memory: EpisodeMemoryEntry[]) {
  await writeJsonFile(paths.episodeMemory, memory.slice(0, 500));
}

export async function updateEpisodeMemoryFromEp(ep: GhostEp) {
  const memory = await getEpisodeMemory();
  const endingMechanic = ep.coreIdea?.payoffMechanic || ep.storyBeats?.[ep.storyBeats.length - 1]?.beat || ep.story.split(/[.!?。！？]/).filter(Boolean).pop()?.trim() || "";
  const entry: EpisodeMemoryEntry = {
    epId: ep.id,
    title: ep.title,
    centralIdea: ep.coreIdea?.centralIdea ?? "",
    storyBeats: (ep.storyBeats ?? []).map((beat) => beat.beat).filter(Boolean),
    coreConflict: ep.coreIdea?.coreConflict ?? "",
    hookMechanic: ep.coreIdea?.hookMechanic || ep.hook,
    endingMechanic,
    location: ep.episodeState?.primaryLocation || ep.episodeState?.location || "",
    mainObject: ep.episodeState?.mainProps || ep.episodeState?.props || "",
    template: ep.templateName || ep.category,
    createdAt: new Date().toISOString()
  };
  const next = [entry, ...memory.filter((item) => item.epId !== ep.id)];
  await saveEpisodeMemory(next);
  return entry;
}

function extractKeywords(ep: GhostEp) {
  const phrases = [
    ep.title,
    ep.coreIdea?.centralIdea,
    ep.coreIdea?.coreConflict,
    ep.coreIdea?.hookMechanic,
    ep.coreIdea?.payoffMechanic,
    ep.episodeState?.primaryLocation || ep.episodeState?.location,
    ep.episodeState?.mainProps || ep.episodeState?.props,
    ep.category
  ];
  return phrases
    .map((phrase) => String(phrase ?? "")
      .replace(/[^\p{L}\p{N}\s#]+/gu, " ")
      .replace(/\s+/g, " ")
      .replace(/^#+/, "")
      .trim())
    .filter((phrase) => phrase.length >= 2)
    .slice(0, 30);
}

function uniqueRecent(nextItems: string[], oldItems: string[]) {
  const seen = new Set<string>();
  return [...nextItems, ...oldItems]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 100);
}

export async function updateIdeaMemoryFromEp(ep: GhostEp) {
  const memory = await getIdeaMemory();
  const category = ep.category || "Uncategorized";
  memory.categories[category] = (memory.categories[category] ?? 0) + 1;
  memory.recentKeywords = uniqueRecent(extractKeywords(ep), memory.recentKeywords);
  await saveIdeaMemory(memory);
  return memory;
}

export async function updateEpStatus(epId: string, status: EpStatus) {
  const history = await getEpHistory();
  const index = history.findIndex((ep) => ep.id === epId);
  if (index === -1) return null;
  history[index] = { ...history[index], status };
  await saveEpHistory(history);
  return history[index];
}

export async function updateEpChecklist(epId: string, checklist: GhostEp["checklist"]) {
  const history = await getEpHistory();
  const index = history.findIndex((ep) => ep.id === epId);
  if (index === -1) return null;
  history[index] = normalizeStoredEp({ ...history[index], checklist });
  await saveEpHistory(history);
  return history[index];
}

export async function updateEpThumbnail(epId: string, thumbnailImage: string) {
  const history = await getEpHistory();
  const index = history.findIndex((ep) => ep.id === epId);
  if (index === -1) return null;
  history[index] = { ...history[index], thumbnailImage, updatedAt: new Date().toISOString() };
  await saveEpHistory(history);
  return history[index];
}

export async function updateEpPartial(epId: string, patch: Partial<GhostEp>) {
  const history = await getEpHistory();
  const index = history.findIndex((ep) => ep.id === epId);
  if (index === -1) return null;
  history[index] = normalizeStoredEp({ ...history[index], ...patch, updatedAt: new Date().toISOString() });
  await saveEpHistory(history);
  return history[index];
}

export async function deleteEpById(epId: string) {
  const history = await getEpHistory();
  const target = history.find((ep) => ep.id === epId);
  if (!target) return null;
  await saveEpHistory(history.filter((ep) => ep.id !== epId));
  return target;
}

export function normalizeStoredEp(ep: GhostEp): GhostEp {
  const frames = Array.isArray(ep.frames) ? ep.frames : [];
  const videos = Array.isArray(ep.videos) ? ep.videos : [];
  const leanFrames = frames.map((frame) => ({
    frameId: frame.frameId,
    title: frame.title,
    imagePrompt: frame.imagePrompt
  }));
  const leanVideos = videos.map((video) => ({
    videoId: video.videoId,
    fromFrame: video.fromFrame,
    toFrame: video.toFrame,
    durationSec: FLOW_VIDEO_DURATION_SEC,
    videoPrompt: video.videoPrompt || (video as unknown as { prompt?: string }).prompt || "",
    camera: video.camera ?? "",
    motion: video.motion ?? "",
    audio: video.audio ?? "",
    dialogue: video.dialogue ?? "",
    mood: video.mood ?? ""
  }));
  const durationSec = (videos.length || leanVideos.length) * FLOW_VIDEO_DURATION_SEC || (ep.durationSec ?? Number(String(ep.format || "").match(/\d+(\.\d+)?/)?.[0] ?? 0));
  const normalized: GhostEp = {
    ...ep,
    date: ep.date || new Date().toISOString().slice(0, 10),
    format: ep.format || `${durationSec || 0}s`,
    durationSec,
    status: ep.status ?? "prompt_ready",
    projectId: ep.projectId || "default-project",
    characterId: ep.characterId || "meow",
    characterName: ep.characterName || "Meow",
    templateId: ep.templateId || "legacy",
    templateName: ep.templateName || "Legacy Meow",
    contentGoal: ep.contentGoal || "Entertainment",
    language: ep.language || "Thai",
    thumbnailImage: ep.thumbnailImage ?? "",
    frameImages: ep.frameImages ?? {},
    promptVersions: Array.isArray(ep.promptVersions) ? ep.promptVersions : [],
    plannedPostDate: ep.plannedPostDate ?? "",
    postedDate: ep.postedDate ?? "",
    analytics: { ...defaultAnalytics, ...(ep.analytics ?? {}) },
    category: ep.category || "Uncategorized",
    coreIdea: { ...defaultCoreIdea, ...(ep.coreIdea ?? {}) },
    storyBeats: Array.isArray(ep.storyBeats) ? ep.storyBeats : [],
    episodeState: { ...defaultEpisodeState, ...(ep.episodeState ?? {}) },
    characterAnchor: ep.characterAnchor || defaultCharacterAnchor,
    visualLock: ep.visualLock,
    voiceLock: ep.voiceLock,
    voiceProfile: { ...defaultVoiceProfile, ...(ep.voiceProfile ?? {}) },
    visualStates: Array.isArray(ep.visualStates) ? ep.visualStates : [],
    dialogueOutline: Array.isArray(ep.dialogueOutline) ? ep.dialogueOutline : [],
    continuitySelfCheck: { ...defaultContinuitySelfCheck, ...(ep.continuitySelfCheck ?? {}) },
    qualityReview: { ...defaultQualityReview, ...(ep.qualityReview ?? {}) },
    hashtags: Array.isArray(ep.hashtags) ? ep.hashtags : [],
    frames: leanFrames,
    videos: leanVideos,
    checklist: createChecklistFromParts(leanFrames, leanVideos, ep.checklist ?? {}),
    viralScore: Number(ep.viralScore || 0),
    duplicateCheck: ep.duplicateCheck ?? {
      isDuplicate: false,
      similarityScore: 0
    },
    parseHealth: {
      ...defaultParseHealth,
      ...(ep.parseHealth ?? {})
    },
    createdAt: ep.createdAt || new Date().toISOString(),
    updatedAt: ep.updatedAt || ep.createdAt || new Date().toISOString()
  };
  const migrated = ensureEpLocks(normalized);
  migrated.voiceScript = migrated.language === "No Dialogue" ? "" : voiceScriptFromManifest(buildVoiceManifest(migrated));
  return { ...migrated, checklist: checklistForEp(migrated) };
}

function safeSegment(input: string) {
  return input.replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function createMarkdown(ep: GhostEp) {
  const normalized = ensureEpLocks(ep);
  const manifest = buildVoiceManifest(normalized);
  const voiceScript = voiceScriptFromManifest(manifest);
  const storyBeats = (ep.storyBeats ?? [])
    .map((beat) => `- ${beat.beatId}: ${beat.function}${beat.function ? " - " : ""}${beat.beat}`)
    .join("\n");
  const visualStates = (ep.visualStates ?? [])
    .map(
      (state) =>
        `### ${state.frameId}\nlocationLayout: ${state.locationLayout}\ncharacterPosition: ${state.characterPosition}\ncharacterFacingDirection: ${state.characterFacingDirection}\ncameraPosition: ${state.cameraPosition}\ncameraAngle: ${state.cameraAngle}\ncameraDistance: ${state.cameraDistance}\nmainPropPosition: ${state.mainPropPosition}\nlightingDirection: ${state.lightingDirection}\nemotionState: ${state.emotionState}\nactionState: ${state.actionState}`
    )
    .join("\n\n");
  const dialogueOutline = (ep.dialogueOutline ?? [])
    .map((item) => `- ${item.videoId}: intent=${item.dialogueIntent}; intensity=${item.emotionalIntensity}; speechPattern=${item.speechPattern}; forbiddenToneShift=${item.forbiddenToneShift}`)
    .join("\n");
  const frames = ep.frames
    .map((frame) => `### ${frame.frameId}\nTitle: ${frame.title}\nImage Prompt: ${renderImagePrompt(ep, frame)}`)
    .join("\n\n");
  const videos = ep.videos
    .map(
      (video) =>
        `### ${video.videoId}\nFrom: ${video.fromFrame}\nTo: ${video.toFrame}\nDuration: ${video.durationSec}\nVideo Prompt: ${renderVideoPrompt(ep, video)}`
    )
    .join("\n\n");

  return `# ${ep.title}

## Format
${ep.format}

## Status
${ep.status}

## Character
${ep.characterName} (${ep.characterId})

## Template
${ep.templateName} (${ep.templateId})

## Content Goal
${ep.contentGoal}

## Spoken Language
${ep.language}

## Thumbnail Image
${ep.thumbnailImage ? "stored in ep.json" : ""}

## Category
${ep.category}

## Viral Score
${ep.viralScore}

## Core Idea
centralIdea: ${ep.coreIdea?.centralIdea ?? ""}
coreConflict: ${ep.coreIdea?.coreConflict ?? ""}
hookMechanic: ${ep.coreIdea?.hookMechanic ?? ""}
payoffMechanic: ${ep.coreIdea?.payoffMechanic ?? ""}
emotionTarget: ${ep.coreIdea?.emotionTarget ?? ""}
noveltyAngle: ${ep.coreIdea?.noveltyAngle ?? ""}
templateLogic: ${ep.coreIdea?.templateLogic ?? ""}

## Story Beats
${storyBeats}

## Episode State
primaryLocation: ${ep.episodeState?.primaryLocation ?? ""}
location: ${ep.episodeState?.location ?? ""}
timeOfDay: ${ep.episodeState?.timeOfDay ?? ""}
lightingStyle: ${ep.episodeState?.lightingStyle ?? ""}
mainProps: ${ep.episodeState?.mainProps ?? ""}
continuityAnchor: ${ep.episodeState?.continuityAnchor ?? ""}
characterStartPosition: ${ep.episodeState?.characterStartPosition ?? ""}
characterEndPosition: ${ep.episodeState?.characterEndPosition ?? ""}
lighting: ${ep.episodeState?.lighting ?? ""}
props: ${ep.episodeState?.props ?? ""}
voice: ${ep.episodeState?.voice ?? ""}
camera: ${ep.episodeState?.camera ?? ""}
cameraLanguage: ${ep.episodeState?.cameraLanguage ?? ""}
environmentAudio: ${ep.episodeState?.environmentAudio ?? ""}
visualAnchor: ${ep.episodeState?.visualAnchor ?? ""}
emotionProgression: ${ep.episodeState?.emotionProgression ?? ""}

## Character Anchor
${normalized.characterAnchor ?? ""}

## Visual Lock
visualLockId: ${normalized.visualLock?.visualLockId ?? ""}
characterCapsule: ${normalized.visualLock?.characterCapsule ?? ""}
referenceImageUrls: ${normalized.visualLock?.referenceImageUrls.join(", ") ?? ""}
primaryLocation: ${normalized.visualLock?.primaryLocation ?? ""}
lightingStyle: ${normalized.visualLock?.lightingStyle ?? ""}
continuityAnchor: ${normalized.visualLock?.continuityAnchor ?? ""}
mainProps: ${normalized.visualLock?.mainProps.join(", ") ?? ""}
locked: ${normalized.visualLock?.locked ?? false}

## Voice Lock
voiceLockId: ${normalized.voiceLock?.voiceLockId ?? ""}
renderMode: ${normalized.voiceLock?.renderMode ?? "external_tts"}
provider: ${normalized.voiceLock?.provider ?? "manual"}
providerVoiceId: ${normalized.voiceLock?.providerVoiceId ?? ""}
referenceAudioUrl: ${normalized.voiceLock?.referenceAudioUrl ?? ""}

## Voice Profile
preset: ${ep.voiceProfile?.preset ?? ""}
gender: ${ep.voiceProfile?.gender ?? ""}
age: ${ep.voiceProfile?.age ?? ""}
tone: ${ep.voiceProfile?.tone ?? ""}
energy: ${ep.voiceProfile?.energy ?? ""}
speakingSpeed: ${ep.voiceProfile?.speakingSpeed ?? ""}
accent: ${ep.voiceProfile?.accent ?? ""}
personality: ${ep.voiceProfile?.personality ?? ""}
sentenceLength: ${ep.voiceProfile?.sentenceLength ?? ""}
vocabularyStyle: ${ep.voiceProfile?.vocabularyStyle ?? ""}
emotionalRange: ${ep.voiceProfile?.emotionalRange ?? ""}

## Visual States
${visualStates}

## Dialogue Outline
${dialogueOutline}

## Quality Review
storyQualityScore: ${ep.qualityReview?.storyQualityScore ?? 0}
storyBeatContinuityScore: ${ep.qualityReview?.storyBeatContinuityScore ?? 0}
visualContinuityScore: ${ep.qualityReview?.visualContinuityScore ?? 0}
videoContinuityScore: ${ep.qualityReview?.videoContinuityScore ?? 0}
dialogueConsistencyScore: ${ep.qualityReview?.dialogueConsistencyScore ?? 0}
voiceContinuityScore: ${ep.qualityReview?.voiceContinuityScore ?? 0}
noveltyScore: ${ep.qualityReview?.noveltyScore ?? 0}
templateMatchScore: ${ep.qualityReview?.templateMatchScore ?? 0}
characterConsistencyScore: ${ep.qualityReview?.characterConsistencyScore ?? 0}
episodeCompletenessScore: ${ep.qualityReview?.episodeCompletenessScore ?? 0}
threshold: ${ep.qualityReview?.threshold ?? 85}
passed: ${ep.qualityReview?.passed ?? false}
notes: ${ep.qualityReview?.notes ?? ""}

## Story
${ep.story}

## Hook
${ep.hook}

## Frames

${frames}

## Videos

${videos}

## Voice Script
${voiceScript}

## Voice Manifest
${JSON.stringify(manifest, null, 2)}

## Sound Effects
${ep.soundEffects}

## Caption
${ep.caption}

## Hashtags
${ep.hashtags.join(" ")}

## Parse Health
score: ${ep.parseHealth?.score ?? 0}
status: ${ep.parseHealth?.status ?? "warning"}
missing: ${ep.parseHealth?.missing?.join(", ") ?? ""}

## Duplicate Check
isDuplicate: ${ep.duplicateCheck.isDuplicate}
similarityScore: ${ep.duplicateCheck.similarityScore}
matchedEpId: ${ep.duplicateCheck.matchedEpId ?? ""}
matchedTitle: ${ep.duplicateCheck.matchedTitle ?? ""}

## Production Checklist
${ep.frames.map((frame) => `- [${ep.checklist.frames?.[frame.frameId] ? "x" : " "}] สร้างรูป ${frame.frameId}`).join("\n")}
${ep.videos.map((video) => `- [${ep.checklist.videos?.[video.videoId] ? "x" : " "}] สร้าง ${video.videoId}`).join("\n")}
- [${ep.checklist.editedDone ? "x" : " "}] ตัดต่อ
- [${ep.checklist.postedDone ? "x" : " "}] โพสต์
`;
}

export function framesText(ep: GhostEp) {
  return ep.frames.map((frame) => `${frame.frameId}${frame.title ? ` - ${frame.title}` : ""}\n${renderImagePrompt(ep, frame)}`).join("\n\n");
}

export function videosText(ep: GhostEp) {
  return ep.videos
    .map(
      (video) =>
        `${video.videoId} (${video.fromFrame} -> ${video.toFrame}, ${video.durationSec}s)\n${renderVideoPrompt(ep, video)}`
    )
    .join("\n\n");
}

export async function exportEpPackage(ep: GhostEp, outputRootOverride?: string) {
  const settings = await getSettings();
  const epDir = path.join(root, outputRootOverride || settings.outputRoot, ep.date, ep.format, safeSegment(ep.id));
  await fs.mkdir(epDir, { recursive: true });
  const normalized = normalizeStoredEp(ep);
  const manifest = buildVoiceManifest(normalized);
  const voiceScript = voiceScriptFromManifest(manifest);
  const timingPlan = {
    episodeId: normalized.id,
    provider: "google-flow-veo",
    providerDurationSec: FLOW_VIDEO_DURATION_SEC,
    totalDurationSec: normalized.videos.length * FLOW_VIDEO_DURATION_SEC,
    videos: normalized.videos.map((video) => ({
      videoId: video.videoId,
      fromFrame: video.fromFrame,
      toFrame: video.toFrame,
      durationSec: video.durationSec,
      timingPlan: video.timingPlan
    }))
  };
  const filePath = path.join(epDir, "prompts.md");
  await fs.writeFile(filePath, createMarkdown(normalized), "utf8");
  await Promise.all([
    fs.writeFile(path.join(epDir, "frames.txt"), framesText(normalized), "utf8"),
    fs.writeFile(path.join(epDir, "videos.txt"), videosText(normalized), "utf8"),
    fs.writeFile(path.join(epDir, "caption.txt"), `${normalized.caption}\n\n${normalized.hashtags.join(" ")}\n`, "utf8"),
    fs.writeFile(path.join(epDir, "voice-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(epDir, "voice-script.txt"), `${voiceScript}\n`, "utf8"),
    fs.writeFile(path.join(epDir, "timing-plan.json"), `${JSON.stringify(timingPlan, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(epDir, "ep.json"), `${JSON.stringify(normalized, null, 2)}\n`, "utf8")
  ]);
  return { epDir, markdownPath: filePath };
}

export const exportEpMarkdown = exportEpPackage;
