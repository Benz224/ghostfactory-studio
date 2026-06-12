export type FramePrompt = {
  frameId: string;
  title: string;
  imagePrompt: string;
  frameState?: VisualState;
  flowStatus?: FlowAssetStatus;
  flowAssetLabel?: string;
  flowNotes?: string;
};

export type VideoState = {
  videoId: string;
  fromFrame: string;
  toFrame: string;
  startState: string;
  transition: string;
  endState: string;
};

export type VideoPrompt = {
  videoId: string;
  fromFrame: string;
  toFrame: string;
  durationSec: number;
  videoPrompt: string;
  camera: string;
  motion: string;
  audio: string;
  dialogue: string;
  mood: string;
  videoState?: VideoState;
  flowStatus?: FlowAssetStatus;
  flowNotes?: string;
};

export type FlowAssetStatus = "not_started" | "prompt_copied" | "generated" | "selected" | "needs_fix" | "approved";

export type CoreIdea = {
  centralIdea: string;
  coreConflict: string;
  hookMechanic: string;
  payoffMechanic: string;
  emotionTarget: string;
  noveltyAngle: string;
  templateLogic: string;
};

export type StoryBeat = {
  beatId: string;
  role?: "hook" | "goal" | "obstacle" | "escalation" | "payoff";
  function: string;
  beat: string;
  beatFunction?: string;
  visibleEvent?: string;
  characterAction?: string;
  characterEmotion?: string;
  environmentChange?: string;
  mainPropState?: string;
  dialogueIntent?: string;
  tensionLevel?: number;
  endingRole?: string;
};

export type EpisodeState = {
  primaryLocation: string;
  location: string;
  timeOfDay: string;
  lightingStyle: string;
  mainProps: string;
  continuityAnchor: string;
  characterStartPosition: string;
  characterEndPosition: string;
  lighting: string;
  props: string;
  voice: string;
  camera: string;
  cameraLanguage: string;
  environmentAudio: string;
  visualAnchor: string;
  emotionProgression: string;
};

export type ContinuityAnchor = {
  location: string;
  mainProp: string;
  lighting: string;
  timeOfDay: string;
  cameraStyle: string;
  emotionArc: string;
};

export type VoiceProfile = {
  preset: string;
  gender: string;
  age: string;
  tone: string;
  energy: string;
  speakingSpeed: string;
  accent: string;
  personality: string;
  sentenceLength: string;
  vocabularyStyle: string;
  emotionalRange: string;
};

export type VisualState = {
  frameId: string;
  locationLayout: string;
  characterPosition: string;
  characterFacingDirection: string;
  cameraPosition: string;
  cameraAngle: string;
  cameraDistance: string;
  mainPropPosition: string;
  lightingDirection: string;
  emotionState: string;
  actionState: string;
};

export type DialogueOutlineItem = {
  videoId: string;
  dialogueIntent: string;
  emotionalIntensity: string;
  speechPattern: string;
  forbiddenToneShift: string;
};

export type ContinuitySelfCheck = {
  storyContinuityScore: number;
  frameContinuityScore: number;
  videoContinuityScore: number;
  voiceContinuityScore: number;
  threshold: number;
  passed: boolean;
  notes: string;
};

export type QualityReview = {
  storyQualityScore: number;
  storyDepthScore: number;
  promptDetailScore: number;
  storyBeatContinuityScore: number;
  visualContinuityScore: number;
  videoContinuityScore: number;
  dialogueConsistencyScore: number;
  voiceContinuityScore: number;
  storyBeatAlignmentScore: number;
  hookBeatConsistencyScore: number;
  dialogueBeatConsistencyScore: number;
  templateToneConsistencyScore: number;
  endingMechanicScore: number;
  objectConsistencyScore: number;
  crossFieldConsistencyScore: number;
  repetitionScore: number;
  noveltyScore: number;
  templateMatchScore: number;
  characterConsistencyScore: number;
  episodeCompletenessScore: number;
  threshold: number;
  passed: boolean;
  notes: string;
};

export type EpisodeFacts = {
  mainObject: string;
  secondaryObject: string;
  location: string;
  hookType: string;
  endingMechanic: string;
  storyArchetype: string;
  catLogicType: string;
};

export type ProductionChecklist = {
  frames: Record<string, boolean>;
  videos: Record<string, boolean>;
  editedDone: boolean;
  postedDone: boolean;
  imageF1Done?: boolean;
  imageF2Done?: boolean;
  imageF3Done?: boolean;
  imageF4Done?: boolean;
  videoV1Done?: boolean;
  videoV2Done?: boolean;
  videoV3Done?: boolean;
};

export type EpStatus = "idea" | "prompt_ready" | "frame_ready" | "video_ready" | "posted" | "archived";

export type ContentGoal = "Entertainment" | "Affiliate" | "Educational" | "Review";

export type SpokenLanguage = "Thai" | "English" | "Japanese" | "Korean" | "Chinese" | "No Dialogue";

export type AffiliateBrief = {
  productName: string;
  productProblem: string;
  productBenefit: string;
  ctaText: string;
};

export type GhostCharacter = {
  id: string;
  name: string;
  type: string;
  description: string;
  visualStyle: string;
  personality: string[];
  rules: string[];
  negativeRules: string[];
  imageUrl?: string;
  imagePath?: string;
  referenceImages?: string[];
  expressions?: string[];
  poses?: string[];
  voicePreset?: string;
  defaultLanguage?: SpokenLanguage;
  languagePreference?: SpokenLanguage;
  createdAt?: string;
  updatedAt?: string;
  isDefault: boolean;
};

export type GhostTemplate = {
  id: string;
  name: string;
  category: string;
  goal: string;
  structure: string[];
  bestFor: string[];
  defaultFrameCount: number;
  defaultVideoCount: number;
  tone: string;
  languageSupport?: SpokenLanguage[];
  isDefault: boolean;
};

export type ParseHealth = {
  score: number;
  parsedFields: string[];
  missing: string[];
  status: "ok" | "warning";
};

export type ParseDebug = {
  epLabel: string;
  title: string;
  format: string;
  category: string;
  viralScore: number;
  story: string;
  hook: string;
  framesCount: number;
  videosCount: number;
  parsedFields: string[];
  missingFields: string[];
};

export type GhostEp = {
  id: string;
  date: string;
  format: string;
  durationSec?: number;
  status: EpStatus;
  projectId?: string;
  characterId: string;
  characterName: string;
  templateId: string;
  templateName: string;
  contentGoal: ContentGoal;
  language: SpokenLanguage;
  thumbnailImage?: string;
  frameImages?: Record<string, string>;
  promptVersions?: PromptVersion[];
  plannedPostDate?: string;
  postedDate?: string;
  analytics?: EpAnalytics;
  title: string;
  storyArchetype?: string;
  episodeFacts?: EpisodeFacts;
  coreIdea?: CoreIdea;
  storyBeats?: StoryBeat[];
  episodeState?: EpisodeState;
  continuityAnchor?: ContinuityAnchor;
  characterAnchor?: string;
  voiceProfile?: VoiceProfile;
  visualStates?: VisualState[];
  dialogueOutline?: DialogueOutlineItem[];
  continuitySelfCheck?: ContinuitySelfCheck;
  qualityReview?: QualityReview;
  story: string;
  hook: string;
  category: string;
  frames: FramePrompt[];
  videos: VideoPrompt[];
  voiceScript: string;
  soundEffects: string;
  caption: string;
  hashtags: string[];
  checklist: ProductionChecklist;
  viralScore: number;
  duplicateCheck: {
    isDuplicate: boolean;
    similarityScore: number;
    matchedEpId?: string;
    matchedTitle?: string;
  };
  parseHealth: ParseHealth;
  parseDebug?: ParseDebug;
  createdAt: string;
  updatedAt?: string;
};

export type PromptVersion = {
  id: string;
  label: string;
  prompt: string;
  createdAt: string;
};

export type EpAnalytics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  revenue: number;
  affiliateClicks: number;
};

export type Idea = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  note: string;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  daily24sCount: number;
  daily16sCount: number;
  creditMode: "low" | "normal" | "high";
  autoImageGeneration: boolean;
  aiMode: "manual";
  defaultLanguage: "thai" | "english";
  outputRoot: string;
  duplicateSimilarityThreshold: number;
};

export type GenerationSetup = {
  aiMode: "manual" | "openai_api" | "image_generation";
  autoFrameCount: boolean;
  autoImageGeneration: boolean;
  creditMode: "low" | "medium" | "high";
  customFramesEnabled: boolean;
  durationPerVideoSec: number;
  duplicateCheckEnabled: boolean;
  duplicateSimilarityThreshold: number;
  framesPerEpisode: number;
  framePromptsOnly: boolean;
  outputRoot: string;
  saveAfterGeneration: boolean;
  saveOnlySelectedEp: boolean;
  totalEpisodes: number;
  videosPerEpisode: number;
};

export type CharacterProfile = {
  name: string;
  description: string;
  characterLock: string;
  forbiddenChanges: string[];
  globalNegativeRules: string[];
  visualStyle: string;
  contentStyle: string[];
  rules: string[];
};

export type GeneratorSelection = {
  character: GhostCharacter;
  template: GhostTemplate;
  contentGoal: ContentGoal;
  language: SpokenLanguage;
  generationSetup?: GenerationSetup;
  affiliateBrief?: AffiliateBrief;
};

export type DailyBatch = {
  id: string;
  date: string;
  eps: GhostEp[];
  createdAt: string;
};

export type DuplicateResult = GhostEp["duplicateCheck"];

export type IdeaMemory = {
  categories: Record<string, number>;
  recentKeywords: string[];
  recentTwists: string[];
};
