import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const root = cwd();
const generator = readFileSync(join(root, "src/lib/ep-generator.ts"), "utf8");
const promptTemplate = readFileSync(join(root, "src/lib/prompt-template.ts"), "utf8");
const characterAssets = readFileSync(join(root, "src/lib/character-assets.ts"), "utf8");
const packageJson = readFileSync(join(root, "package.json"), "utf8");

const failures = [];

for (const [label, body, text] of [
  ["generator prompt", promptTemplate, "Return compact creative JSON only."],
  ["generator prompt schema", promptTemplate, '"coreIdea"'],
  ["generator prompt schema", promptTemplate, '"episodeState"'],
  ["generator prompt schema", promptTemplate, '"storyBeats"'],
  ["memory cap", promptTemplate, "slice(0, 1200)"],
  ["character capsule helper", characterAssets, "buildCharacterPromptCapsule"],
  ["asset lookup", characterAssets, "findCharacterAsset"],
  ["image limit", generator, "IMAGE_PROMPT_MAX_CHARS = 650"],
  ["video limit", generator, "VIDEO_PROMPT_MAX_CHARS = 950"],
  ["legacy sanitizer", generator, "hasLegacySectionLabel"],
  ["no Meow leak guard", generator, "isMeowLeakForNonMeow"],
  ["npm script", packageJson, "validate:prompt-optimization"]
]) {
  if (!body.includes(text)) failures.push(`${label} missing: ${text}`);
}

if (/characterAnchor:\s*DEFAULT_CHARACTER_ANCHOR/.test(generator)) {
  failures.push("default Meow anchor still assigned directly in generator");
}

if (/characterAnchor:\s*ep\.characterAnchor \|\| buildCharacterAnchorFromAsset/.test(generator)) {
  failures.push("internal pipeline still falls back to long asset anchor");
}

if (!/usedConcepts\.slice\(0, 8\)/.test(promptTemplate)) failures.push("usedConcepts is not capped at 8");
if (!/usedLocations\.slice\(0, 6\)/.test(promptTemplate)) failures.push("usedLocations is not capped at 6");
if (!/usedHooks\.slice\(0, 8\)/.test(promptTemplate)) failures.push("usedHooks is not capped at 8");
if (!/usedPayoffs\.slice\(0, 8\)/.test(promptTemplate)) failures.push("usedPayoffs is not capped at 8");

if (failures.length) {
  console.error("Prompt optimization validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Prompt optimization validation passed.");
