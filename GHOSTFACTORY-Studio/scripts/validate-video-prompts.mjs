import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const root = cwd();
const generator = readFileSync(join(root, "src/lib/ep-generator.ts"), "utf8");
const storage = readFileSync(join(root, "src/lib/storage.ts"), "utf8");
const dailyBatch = readFileSync(join(root, "src/components/DailyBatchView.tsx"), "utf8");
const library = readFileSync(join(root, "src/app/library/page.tsx"), "utf8");

const failures = [];

const required = [
  "IMAGE_PROMPT_MAX_CHARS = 650",
  "VIDEO_PROMPT_MAX_CHARS = 950",
  "buildImageProductionPrompt",
  "buildVideoProductionPrompt",
  "buildProductionNegativeSuffix",
  "sanitizeCreativePrompt",
  "Continuous ${durationSec}-second vertical 9:16 cinematic shot, no cuts, no scene changes.",
  "No spoken dialogue or narration; voice-over will be added in post-production.",
  "Voice consistency cannot be guaranteed without a provider voice ID or reference audio."
];

for (const text of required) {
  if (!generator.includes(text)) failures.push(`renderer missing: ${text}`);
}

const legacyProductionPatterns = [
  /formatSection\("SECTION A/i,
  /formatSection\("Clip instruction/i,
  /formatSection\("Negative/i,
  /VOICE CONTINUITY LOCK:\s*"/
];

for (const pattern of legacyProductionPatterns) {
  if (pattern.test(generator)) failures.push(`legacy production section remains: ${pattern}`);
}

for (const [label, body, text] of [
  ["storage export", storage, "renderVideoPrompt(ep, video)"],
  ["generator image metrics", dailyBatch, "Image prompt:"],
  ["generator video metrics", dailyBatch, "Video prompt:"],
  ["library image metrics", library, "Image prompt:"],
  ["library video metrics", library, "Video prompt:"]
]) {
  if (!body.includes(text)) failures.push(`${label} missing: ${text}`);
}

if (!/dialogue:\s*ep\.language === "No Dialogue" \? "" : video\.dialogue/.test(generator)) {
  failures.push("No Dialogue guard does not clear video dialogue");
}

if (!/if \(language === "No Dialogue"\) return "";/.test(generator)) {
  failures.push("No Dialogue guard does not clear voiceScript");
}

for (const [label, body] of [["storage", storage], ["generator", dailyBatch], ["library", library]]) {
  if (/renderVideoPrompt\(ep, video\)}\\nCamera:/.test(body) || /renderVideoPrompt\(ep, video\)}\\nCamera:/.test(body)) {
    failures.push(`${label} still appends Camera/Motion/Audio/Dialogue/Mood after video prompt`);
  }
}

if (/Thai dialogue:|Use the same character voice throughout this episode/.test(generator)) {
  failures.push("external_tts renderer still includes dialogue or soft voice lock text");
}

if (failures.length) {
  console.error("Video prompt validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Video prompt validation passed.");
