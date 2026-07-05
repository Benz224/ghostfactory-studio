import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const root = cwd();
const generator = readFileSync(join(root, "src/lib/ep-generator.ts"), "utf8");
const storage = readFileSync(join(root, "src/lib/storage.ts"), "utf8");
const dailyBatch = readFileSync(join(root, "src/components/DailyBatchView.tsx"), "utf8");
const library = readFileSync(join(root, "src/app/library/page.tsx"), "utf8");
const packageJson = readFileSync(join(root, "package.json"), "utf8");

const failures = [];

for (const [label, body, text] of [
  ["voice lock default", generator, 'renderMode: ep.voiceLock?.renderMode ?? "external_tts"'],
  ["voice manifest", generator, "buildVoiceManifest"],
  ["voice script from manifest", generator, "voiceScriptFromManifest"],
  ["meow voice id", generator, "voiceLockIdFor"],
  ["external tts prompt", generator, "voice-over will be added in post-production"],
  ["storage voice manifest export", storage, "voice-manifest.json"],
  ["storage script from manifest", storage, "voiceScriptFromManifest"],
  ["generator UI panel", dailyBatch, "Episode Voice Master"],
  ["library UI panel", library, "Episode Voice Master"],
  ["package script", packageJson, "validate:voice-continuity"]
]) {
  if (!body.includes(text)) failures.push(`${label} missing: ${text}`);
}

if (/Thai adult cute animated character voice/.test(generator + storage + dailyBatch + library)) {
  failures.push("legacy Thai adult cute animated character voice text remains");
}

if (/Thai dialogue:|Use the same character voice throughout this episode/.test(generator)) {
  failures.push("external_tts video prompt includes dialogue or soft voice lock text");
}

if (failures.length) {
  console.error("Voice continuity validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Voice continuity validation passed.");
