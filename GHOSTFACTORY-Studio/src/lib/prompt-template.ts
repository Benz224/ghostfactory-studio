import type { AffiliateBrief, CharacterProfile, ContentGoal, DailyBatch, GenerationSetup, GhostCharacter, GhostEp, GhostTemplate, IdeaMemory, Settings, SpokenLanguage } from "./types";

import { frameCountForTemplatePack, getTemplatePack } from "./template-packs";

export function buildCharacterLock(character: GhostCharacter) {
  return `Character ID:
${character.id}`;
}

export function buildTemplateInstructions(template: GhostTemplate) {
  const pack = getTemplatePack(`${template.id} ${template.name} ${template.category} ${template.goal}`);
  return `Template:
- templateId: ${template.id}
- summary: ${pack.id}; ${pack.coreConflict}; ${pack.payoffMechanic}`;
}

function chooseAutoFrameCountFromTemplate(template: GhostTemplate, contentGoal: ContentGoal) {
  return frameCountForTemplatePack(getTemplatePack(`${template.name} ${template.category} ${template.goal} ${contentGoal}`));
}

function affiliateInstructions(contentGoal: ContentGoal, brief?: AffiliateBrief) {
  if (contentGoal !== "Affiliate" && contentGoal !== "Review") return "";
  return `Content Goal Brief:
- Product Name: ${brief?.productName || ""}
- Problem: ${brief?.productProblem || ""}
- Benefit: ${brief?.productBenefit || ""}
- CTA Text: ${brief?.ctaText || ""}`;
}

function languageInstructions(language: SpokenLanguage) {
  if (language === "No Dialogue") {
    return `Language:
No Dialogue`;
  }

  return `Language:
${language}`;
}

export function buildGeneratorPrompt({
  character,
  template,
  contentGoal,
  settings,
  language = "Thai",
  generationSetup,
  affiliateBrief
}: {
  character: GhostCharacter;
  template: GhostTemplate;
  contentGoal: ContentGoal;
  settings: Settings;
  language?: SpokenLanguage;
  generationSetup?: GenerationSetup;
  affiliateBrief?: AffiliateBrief;
}) {
  const autoFrameCount = Boolean(generationSetup?.autoFrameCount);
  const autoFrames = autoFrameCount ? chooseAutoFrameCountFromTemplate(template, contentGoal) : 0;
  const videosPerEpisode = autoFrameCount ? Math.max(1, autoFrames - 1) : Math.max(1, Number(generationSetup?.videosPerEpisode ?? 3));
  const framesPerEpisode = autoFrameCount ? autoFrames : Math.max(2, Number(generationSetup?.customFramesEnabled ? generationSetup.framesPerEpisode : videosPerEpisode + 1));
  const durationPerVideoSec = Math.max(1, Number(generationSetup?.durationPerVideoSec ?? 8));
  const totalDurationSec = videosPerEpisode * durationPerVideoSec;
  const totalCount = Math.max(1, Number(generationSetup?.totalEpisodes ?? settings.daily24sCount + settings.daily16sCount));

  return `คุณคือ GHOSTFACTORY Multi Character Content Factory

Prompt Scope:
- Write creative content only.
- GHOSTFACTORY code loads character assets, template config, continuity, voice lock, quality review, and final prompt assembly.
- Do not recreate character anchor, template rules, quality scores, or memory logic.
- Do not generate abstract summaries.
- Never write Story as "Observation / Problem / Payoff".
- Story must describe visible events in chronological order.

${buildCharacterLock(character)}

${buildTemplateInstructions(template)}

Content Goal:
${contentGoal}

${languageInstructions(language)}

Batch Settings:
- Total EP count: ${totalCount}
- Videos per EP: ${videosPerEpisode}
- Frames per EP: ${framesPerEpisode}
- Auto frame count: ${autoFrameCount ? "enabled" : "disabled"}
- Duration per video: ${durationPerVideoSec} seconds
- Total EP duration: ${totalDurationSec} seconds

Content Draft Rules:
- Generate multiple EP options in one batch.
- Create exactly ${videosPerEpisode} videos and ${framesPerEpisode} frames per EP.
- Every EP must include Hook, Goal, Obstacle, Escalation, and Payoff in the story.
- Avoid flat structure: Observation -> Action -> End.
- Use: Observation -> Goal -> Problem -> Escalation -> Payoff.
- imagePrompt must be 40-80 words and include character action, emotion, environment, main prop, composition, camera framing, lighting, and visual mood.
- videoPrompt must be 70-140 words and include start state, transition action, end state, camera movement, character movement, prop movement, environment audio, and emotional progression.
- Do not output one-line object descriptions or short one-line video prompts.
- Do not add subtitles, caption overlay, text overlay, watermark, or logo.
- Do not output SECTION labels, Character Anchor, Episode State, Voice Profile, Quality Review, Core Idea debug, templateLogic, continuity notes, actionState, emotionState, dialogueIntent, or "From the previous beat".
${affiliateInstructions(contentGoal, affiliateBrief)}

Output Rules:
- ตอบเป็น JSON เท่านั้น
- ห้ามมี Markdown
- ห้ามมีคำอธิบายนอก JSON
- ทุก EP ต้องมี characterId, templateId, language
- ถ้า language เป็น "No Dialogue" ห้ามมีบทพูดใน dialogue และ voiceScript

JSON schema:
{
  "eps": [
    {
      "id": "EP01",
      "title": "",
      "format": "${totalDurationSec}s",
      "durationSec": ${totalDurationSec},
      "category": "",
      "viralScore": 0,
      "characterId": "${character.id}",
      "templateId": "${template.id}",
      "language": "${language}",
      "story": "",
      "hook": "",
      "frames": [
        {
          "frameId": "F1",
          "title": "",
          "imagePrompt": ""
        }
      ],
      "videos": [
        {
          "videoId": "V1",
          "fromFrame": "F1",
          "toFrame": "F2",
          "durationSec": ${durationPerVideoSec},
          "videoPrompt": "",
          "camera": "",
          "motion": "",
          "audio": "",
          "dialogue": "",
          "mood": ""
        }
      ],
      "voiceScript": "",
      "soundEffects": "",
      "caption": "",
      "hashtags": []
    }
  ]
}`;
}

export function createDailyAiPrompt(character: CharacterProfile) {
  const globalRules = character.globalNegativeRules?.length
    ? character.globalNegativeRules
    : ["no subtitles", "no caption overlay", "no text overlay", "no watermark", "no logo", "no background music by default", "vertical 9:16", "commercial quality visuals"];
  return `คุณคือ Daily Content Generator ของโปรเจค GHOSTFACTORY

ให้สร้างคอนเทนต์ TikTok/Reels/Shorts สำหรับตัวละครหลักชื่อ ${character.name}

Character Lock:
Character asset is loaded by GHOSTFACTORY code. Use character name and type only; do not recreate appearance, voice lock, or anchor rules.

ห้าม:
${(character.forbiddenChanges ?? []).map((rule) => `- ${rule}`).join("\n")}

Character:
${character.name} คือ${character.description.replace(/^Meow\s*คือ/, "")}

Visual Style:
${character.visualStyle}

Rules:
${character.rules.map((rule) => `- ${rule}`).join("\n")}
${globalRules.map((rule) => `- ${rule}`).join("\n")}
- แต่ละ Prompt ต้องละเอียดพอสำหรับสร้างภาพ/วิดีโอ
- Frame Prompt ต้องเป็น creative image prompt 40-80 words เท่านั้น
- Video Prompt ต้องเป็น creative video prompt 70-140 words เท่านั้น
- Story ต้องเป็นเหตุการณ์ที่เห็นได้แบบเรียงเวลา และมี Hook, Goal, Obstacle, Escalation, Payoff
- ห้ามเขียน Story แบบ Observation / Action / End หรือ Observation / Problem / Payoff
- ระบบ GHOSTFACTORY จะประกอบ Character Anchor, Continuity, Voice Lock, Prompt Assembly และ Quality Review ใน code เอง
- ห้ามใส่ Core Idea, Episode State, Voice Profile, Quality Review, storyBeat, actionState, emotionState, dialogueIntent, SECTION labels, หรือ From the previous beat ลง output

วันนี้ให้สร้าง 6 EP:
- 3 EP แบบ 24 วินาที ใช้ F1-F4 และ V1-V3
- 3 EP แบบ 16 วินาที ใช้ F1-F3 และ V1-V2

สำหรับแต่ละ EP ให้ตอบในรูปแบบนี้:

EP Title:
Format:
Category:
Viral Score:
Story:
Hook:

Frames:
F1:
Title:
Image Prompt:

F2:
Title:
Image Prompt:

F3:
Title:
Image Prompt:

F4 ถ้ามี:
Title:
Image Prompt:

Videos:
V1:
From:
To:
Duration:
Video Prompt:

V2:
From:
To:
Duration:
Video Prompt:

V3 ถ้ามี:
From:
To:
Duration:
Video Prompt:

Voice Script:
Sound Effects:
Caption:
Hashtags:

ข้อสำคัญ:
ห้ามสร้าง EP ที่ซ้ำกับรายการเก่า ถ้าผมใส่รายการ EP เก่าให้ ให้หลีกเลี่ยงชื่อ มุก โครงเรื่อง และจุดหักมุมที่คล้ายกัน`;
}

export function createDailyJsonPrompt(character: CharacterProfile) {
  return `${createDailyAiPrompt(character)}

ให้ตอบเป็น JSON เท่านั้น ห้ามมี Markdown ห้ามมีคำอธิบายนอก JSON

JSON schema:
{
  "eps": [
    {
      "id": "EP01",
      "title": "",
      "format": "16s",
      "category": "",
      "viralScore": 0,
      "story": "",
      "hook": "",
      "frames": [
        {
          "frameId": "F1",
          "title": "",
          "imagePrompt": ""
        }
      ],
      "videos": [
        {
          "videoId": "V1",
          "fromFrame": "F1",
          "toFrame": "F2",
          "durationSec": 8,
          "videoPrompt": "",
          "camera": "",
          "motion": "",
          "audio": "",
          "dialogue": "",
          "mood": ""
        }
      ],
      "voiceScript": "",
      "soundEffects": "",
      "caption": "",
      "hashtags": []
    }
  ]
}`;
}

function cleanMemoryPhrase(value?: string) {
  return value
    ?.replace(/From the previous beat\s*\([^)]*\),?\s*/gi, "")
    .replace(/\b(Observation|Goal|Problem|Escalation|Payoff):\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulMemoryPhrase(value: string) {
  return Boolean(value) && !/^(same continuous scene|same room|main story prop|same time of day|cinematic lighting|continuous cinematic camera|continuous environment audio|controlled progression|curiosity\s*->\s*reaction|curious\s*->\s*tense\s*->\s*payoff|opening hook|initial beat position|final beat position|story beat|connector \d+)$/i.test(value);
}

function addUniquePhrase(list: string[], value?: string, max = 90) {
  const phrase = cleanMemoryPhrase(value);
  if (!phrase || !isUsefulMemoryPhrase(phrase)) return;
  const clipped = phrase.length > max ? `${phrase.slice(0, max).trim()}...` : phrase;
  if (!list.some((item) => item.toLowerCase() === clipped.toLowerCase())) {
    list.push(clipped);
  }
}

function phraseList(title: string, items: string[]) {
  return `${title}:
${items.length ? items.map((item) => `- ${item}`).join("\n") : "- none"}`;
}

function episodeMemorySummary(history: GhostEp[], limit: number) {
  const usedConcepts: string[] = [];
  const usedLocations: string[] = [];
  const usedHooks: string[] = [];
  const usedPayoffs: string[] = [];
  const usedMechanics: string[] = [];

  history.slice(0, limit).forEach((ep) => {
    addUniquePhrase(usedConcepts, ep.coreIdea?.centralIdea || ep.title);
    addUniquePhrase(usedConcepts, ep.coreIdea?.coreConflict);
    addUniquePhrase(usedLocations, ep.episodeState?.primaryLocation || ep.episodeState?.location);
    addUniquePhrase(usedLocations, ep.episodeState?.visualAnchor);
    addUniquePhrase(usedHooks, ep.coreIdea?.hookMechanic || ep.hook);
    addUniquePhrase(usedPayoffs, ep.coreIdea?.payoffMechanic);
    addUniquePhrase(usedPayoffs, ep.storyBeats?.[ep.storyBeats.length - 1]?.beat);
    addUniquePhrase(usedMechanics, ep.coreIdea?.hookMechanic);
    addUniquePhrase(usedMechanics, ep.coreIdea?.payoffMechanic);
    addUniquePhrase(usedMechanics, ep.episodeState?.mainProps || ep.episodeState?.props);
  });

  return `Episode Memory Summary:
${phraseList("usedConcepts", usedConcepts.slice(0, 18))}

${phraseList("usedLocations", usedLocations.slice(0, 12))}

${phraseList("usedHooks", usedHooks.slice(0, 18))}

${phraseList("usedPayoffs", usedPayoffs.slice(0, 18))}

${phraseList("usedMechanics", usedMechanics.slice(0, 18))}`;
}

export function appendHistoryToPrompt(prompt: string, history: GhostEp[], limit = 50, _ideaMemory?: IdeaMemory) {
  const memorySummary = episodeMemorySummary(history, limit);

  return `${prompt}

${memorySummary}

คำสั่ง:
หลีกเลี่ยง centralIdea, hook, payoff, location, main prop, และ ending mechanic ที่คล้ายกับ Episode Memory Summary ด้านบน`;
}

export function createFullDailyPackagePrompt(promptWithHistory: string, batch?: DailyBatch | null) {
  const slots = batch?.eps?.length
    ? batch.eps
    : [
        { id: "EP01", format: "24s", category: "Comedy" },
        { id: "EP02", format: "24s", category: "Sigma Cat" },
        { id: "EP03", format: "24s", category: "Cat Logic" },
        { id: "EP04", format: "16s", category: "Horror Comedy" },
        { id: "EP05", format: "16s", category: "Fake Documentary" },
        { id: "EP06", format: "16s", category: "Random Absurd Humor" }
      ];

  return `${promptWithHistory}

สร้างตามโครงนี้:

${slots
  .map(
    (ep, index) => `EP${String(index + 1).padStart(2, "0")}
Format: ${ep.format}
Category: ${ep.category || "Uncategorized"}
Status: ${"status" in ep ? ep.status : "idea"}`
  )
  .join("\n\n")}`;
}
