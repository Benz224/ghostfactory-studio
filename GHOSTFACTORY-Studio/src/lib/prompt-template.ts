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
- Return compact creative JSON only.
- Code adds character capsules, negative rules, voice lock, continuity, quality review, and final image/video prompt assembly.
- Do not write character anchors, full appearance, section labels, quality scores, or internal implementation rules.

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
- Create exactly ${videosPerEpisode} videos and ${framesPerEpisode} frames per EP.
- title short; story 1-2 sentences; hook max 14 words.
- imagePrompt: English, 12-30 words, scene + action + visual intent only.
- videoPrompt: English, 10-28 words, one continuous action only.
- temporalPlan: four compact 8-second beats per video: 0-1.5, 1.5-3.5, 3.5-5.8, 5.8-8.0.
- camera, motion, audio, mood: short.
- dialogue max 14 words per clip. If language is "No Dialogue", dialogue and voiceScript must be "".
- Do not put character names, appearance locks, negative rules, no subtitles, watermark, logo, vertical 9:16, or section labels inside imagePrompt/videoPrompt.
- Do not write actionState, From the previous beat, initial beat position, progressed by discovery/escalation/reveal, curiosity -> reaction, or camera metadata inside imagePrompt/videoPrompt.
- Do not return incomplete prompt fragments. Every imagePrompt/videoPrompt must contain a complete subject and action.
- Use positive phrasing. One video clip = one continuous event, not multiple scenes.
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
      "coreIdea": {
        "centralIdea": "",
        "coreConflict": "",
        "hookMechanic": "",
        "payoffMechanic": ""
      },
      "episodeState": {
        "primaryLocation": "",
        "timeOfDay": "",
        "lightingStyle": "",
        "mainProps": "",
        "continuityAnchor": ""
      },
      "storyBeats": [
        {
          "beatId": "F1",
          "function": "hook",
          "beat": ""
        }
      ],
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
          "temporalPlan": {
            "beats": [
              {
                "startSec": 0,
                "endSec": 1.5,
                "action": "",
                "visualChange": ""
              },
              {
                "startSec": 1.5,
                "endSec": 3.5,
                "action": "",
                "visualChange": ""
              },
              {
                "startSec": 3.5,
                "endSec": 5.8,
                "action": "",
                "visualChange": ""
              },
              {
                "startSec": 5.8,
                "endSec": 8,
                "action": "",
                "visualChange": ""
              }
            ]
          },
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
- Frame Prompt และ Video Prompt เขียนแบบสั้น ชัดเจน
- ระบบ GHOSTFACTORY จะประกอบ Character Anchor, Continuity, Voice Lock, Prompt Sections และ Quality Review ใน code เอง

วันนี้ให้สร้าง 6 EP:
- 3 EP แบบ 24 วินาที ใช้ F1-F4 และ V1-V3
- 3 EP แบบ 16 วินาที ใช้ F1-F3 และ V1-V2

สำหรับแต่ละ EP ให้ตอบในรูปแบบนี้:

EP Title:
Format:
Category:
Viral Score:
Story:
Core Idea:
Episode State:
Voice Profile:
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
Quality Review:
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
  return value?.replace(/\s+/g, " ").trim();
}

function addUniquePhrase(list: string[], value?: string, max = 55) {
  const phrase = cleanMemoryPhrase(value);
  if (!phrase) return;
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
${phraseList("usedConcepts", usedConcepts.slice(0, 8))}

${phraseList("usedLocations", usedLocations.slice(0, 6))}

${phraseList("usedHooks", usedHooks.slice(0, 8))}

${phraseList("usedPayoffs", usedPayoffs.slice(0, 8))}

${phraseList("usedMechanics", usedMechanics.slice(0, 8))}`.slice(0, 1200);
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
