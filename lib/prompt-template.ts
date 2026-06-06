import type { AffiliateBrief, CharacterProfile, ContentGoal, DailyBatch, GenerationSetup, GhostCharacter, GhostEp, GhostTemplate, IdeaMemory, Settings, SpokenLanguage } from "./types";

export function buildCharacterLock(character: GhostCharacter) {
  return `Character Lock:
- Character ID: ${character.id}
- Name: ${character.name}
- Type: ${character.type}
- Identity: ${character.description}
- Visual Style: ${character.visualStyle}
- Personality: ${character.personality.join(", ")}
- Character Reference Image: ${character.imageUrl ? "Available in studio. Use the selected character reference image as the main visual identity." : "No uploaded reference image."}
- Voice Preset: ${character.voicePreset || "Thai Boy"}
- Default Spoken Language: ${character.defaultLanguage || character.languagePreference || "Thai"}

Rules:
${character.rules.map((rule) => `- ${rule}`).join("\n")}

Negative Rules:
${character.negativeRules.map((rule) => `- ${rule}`).join("\n")}`;
}

export function buildTemplateInstructions(template: GhostTemplate) {
  return `Template:
- Template ID: ${template.id}
- Name: ${template.name}
- Category: ${template.category}
- Goal: ${template.goal}
- Tone: ${template.tone}
- Structure: ${template.structure.join(" -> ")}
- Best For: ${template.bestFor.join(", ")}
- Default Frames: ${template.defaultFrameCount}
- Default Videos: ${template.defaultVideoCount}`;
}

function affiliateInstructions(contentGoal: ContentGoal, brief?: AffiliateBrief) {
  if (contentGoal !== "Affiliate" && contentGoal !== "Review") return "";
  return `Affiliate / Review Brief:
- Product Name: ${brief?.productName || ""}
- Problem: ${brief?.productProblem || ""}
- Benefit: ${brief?.productBenefit || ""}
- CTA Text: ${brief?.ctaText || ""}

Affiliate Rules:
- Hook ภายใน 3 วินาที
- ใช้โครง Problem -> Character Reaction -> Product as Solution -> Soft CTA
- ห้ามขายแข็งเกินไป
- ห้ามพูดเกินจริง
- ห้ามอ้างสรรพคุณเกินจริง
- ให้เป็นคอนเทนต์สนุกก่อน ขายทีหลัง
- หลีกเลี่ยงคำว่า "ดีที่สุด", "แก้ได้ 100%", "รับประกันผล"`;
}

function languageInstructions(language: SpokenLanguage) {
  if (language === "No Dialogue") {
    return `Spoken language in video: No Dialogue
Dialogue language: No Dialogue
Language Rules:
- Create clips with no spoken dialogue.
- Keep dialogue fields empty.
- Voice Script must be empty.
- Use action, camera movement, facial expression, environmental audio, and sound effects only.`;
  }

  return `Spoken language in video: ${language}
Dialogue language: ${language}
Language Rules:
- All dialogue and Voice Script must be written in ${language}.
- Captions and hashtags may match the content strategy, but spoken lines must stay in ${language}.`;
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
  const videosPerEpisode = Math.max(1, Number(generationSetup?.videosPerEpisode ?? 3));
  const framesPerEpisode = Math.max(2, Number(generationSetup?.customFramesEnabled ? generationSetup.framesPerEpisode : videosPerEpisode + 1));
  const durationPerVideoSec = Math.max(1, Number(generationSetup?.durationPerVideoSec ?? 8));
  const totalDurationSec = videosPerEpisode * durationPerVideoSec;
  const totalCount = Math.max(1, Number(generationSetup?.totalEpisodes ?? settings.daily24sCount + settings.daily16sCount));
  const creditMode = generationSetup?.creditMode ?? (settings.creditMode === "normal" ? "medium" : settings.creditMode);
  const countHint = generationSetup
    ? `Generate ${totalCount} EP options. Each EP has exactly ${videosPerEpisode} videos and ${framesPerEpisode} frames. Each video is ${durationPerVideoSec} seconds. Total EP duration is ${totalDurationSec} seconds.`
    : settings.creditMode === "low"
      ? "Create 3 EP focused on 16s"
      : settings.creditMode === "high"
        ? "Create 10 EP if suitable for settings"
        : `Create ${settings.daily24sCount + settings.daily16sCount} EP`;

  return `คุณคือ GHOSTFACTORY Multi Character Content Factory

ให้สร้าง TikTok/Reels/Shorts แบบ Manual AI Mode เท่านั้น
ห้ามเรียก API หรือเครื่องมือภายนอก

${buildCharacterLock(character)}

${buildTemplateInstructions(template)}

Content Goal:
${contentGoal}

${languageInstructions(language)}

Global Visual Style:
- vertical 9:16
- commercial quality visuals
- cinematic lighting
- smooth camera movement
- no subtitles
- no caption overlay
- no text overlay
- no watermark
- no logo
- no background music by default

Batch Settings:
- ${countHint}
- Total EP count: ${totalCount}
- Videos per EP: ${videosPerEpisode}
- Frames per EP: ${framesPerEpisode}
- Duration per video: ${durationPerVideoSec} seconds
- Total EP duration: ${totalDurationSec} seconds
- Video V1 connects F1 to F2.
- Video V2 connects F2 to F3.
- Continue this pattern automatically until V${videosPerEpisode} connects F${videosPerEpisode} to F${videosPerEpisode + 1}.

- Credit mode: ${creditMode}
- AI mode: ${generationSetup?.aiMode ?? settings.aiMode}
- Duplicate check: ${generationSetup?.duplicateCheckEnabled ?? true ? "enabled" : "disabled"}
- Duplicate similarity threshold: ${generationSetup?.duplicateSimilarityThreshold ?? settings.duplicateSimilarityThreshold}
- Auto image generation: ${generationSetup?.autoImageGeneration ? "enabled" : "disabled / manual"}
- Generate frame prompts only: ${generationSetup?.framePromptsOnly ? "yes" : "no"}
- Output root: ${generationSetup?.outputRoot || settings.outputRoot}
- Save generated EP to Library after generation: ${generationSetup?.saveAfterGeneration ? "yes" : "no"}
- Save only selected EP: ${generationSetup?.saveOnlySelectedEp ?? true ? "yes" : "no"}

Generation Rules:
- Respect Character Lock in every imagePrompt and videoPrompt.
- Generate multiple EP options in one batch.
- Match the Template and Content Goal exactly.
- For each EP, create exactly ${videosPerEpisode} videos.
- For each EP, create exactly ${framesPerEpisode} frames.
- Each video duration must be ${durationPerVideoSec} seconds.
- Total EP duration must be ${totalDurationSec} seconds.
- Do not add subtitles, caption overlay, text overlay, watermark, or logo.
${affiliateInstructions(contentGoal, affiliateBrief)}

Output Rules:
- ตอบเป็น JSON เท่านั้น
- ห้ามมี Markdown
- ห้ามมีคำอธิบายนอก JSON
- ทุก imagePrompt และ videoPrompt ต้องรักษา Character Lock
- ทุก EP ต้องมี characterId, characterName, templateId, templateName, contentGoal
- ทุก EP ต้องมี language: "${language}"
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
      "characterName": "${character.name}",
      "templateId": "${template.id}",
      "templateName": "${template.name}",
      "contentGoal": "${contentGoal}",
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
  const characterLock = character.characterLock || "Meow, fluffy orange tabby cat, orange striped fur, cute expressive face, high quality fur, Pixar-quality 3D animation";
  const globalRules = character.globalNegativeRules?.length
    ? character.globalNegativeRules
    : ["no subtitles", "no caption overlay", "no text overlay", "no watermark", "no logo", "no background music by default", "vertical 9:16", "commercial quality visuals"];
  return `คุณคือ Daily Content Generator ของโปรเจค GHOSTFACTORY

ให้สร้างคอนเทนต์ TikTok/Reels/Shorts สำหรับตัวละครหลักชื่อ ${character.name}

Character Lock:
${characterLock}

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
- Frame Prompt ต้องไม่พูดซ้ำกัน
- Video Prompt ต้องระบุการเคลื่อนไหว กล้อง เสียง และอารมณ์ชัดเจน
- ทุก Image Prompt และ Video Prompt ต้องขึ้นต้นหรือมี Character Lock ของ Meow ครบถ้วน

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

function ideaMemorySummary(memory?: IdeaMemory) {
  if (!memory) return "";
  const categories = Object.entries(memory.categories ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([category, count]) => `${category}: ${count}`)
    .join("\n");

  const keywords = (memory.recentKeywords ?? []).slice(0, 60).join(", ");
  const twists = (memory.recentTwists ?? []).slice(0, 30).join(", ");

  return `แนวที่ใช้บ่อย:
${categories || "ยังไม่มีข้อมูล"}

คำ/มุก/สถานการณ์ที่ใช้ไปแล้ว:
${keywords || "ยังไม่มีข้อมูล"}

จุดหักมุมที่ใช้ไปแล้ว:
${twists || "ยังไม่มีข้อมูล"}`;
}

export function appendHistoryToPrompt(prompt: string, history: GhostEp[], limit = 50, ideaMemory?: IdeaMemory) {
  const latest = history.slice(0, limit);
  const historyText = latest.length
    ? latest.map((ep, index) => `${index + 1}. ${ep.title} - ${ep.story}`).join("\n")
    : "ยังไม่มี";

  return `${prompt}

รายการ EP เก่าล่าสุดที่ควรหลีกเลี่ยง:

${historyText}

${ideaMemorySummary(ideaMemory)}

คำสั่ง:
หลีกเลี่ยงการสร้าง EP ที่ชื่อ มุก โครงเรื่อง จุดหักมุม หรือสถานการณ์ใกล้เคียงกับรายการด้านบน`;
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
