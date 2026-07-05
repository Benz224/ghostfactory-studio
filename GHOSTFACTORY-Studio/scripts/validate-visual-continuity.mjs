import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const root = cwd();
const generator = readFileSync(join(root, "src/lib/ep-generator.ts"), "utf8");
const characterAssets = readFileSync(join(root, "src/lib/character-assets.ts"), "utf8");
const meow = readFileSync(join(root, "characters/meow.json"), "utf8");
const storage = readFileSync(join(root, "src/lib/storage.ts"), "utf8");
const dailyBatch = readFileSync(join(root, "src/components/DailyBatchView.tsx"), "utf8");
const library = readFileSync(join(root, "src/app/library/page.tsx"), "utf8");
const packageJson = readFileSync(join(root, "package.json"), "utf8");

const failures = [];

for (const [label, body, text] of [
  ["visual lock type helper", characterAssets, "buildEpisodeVisualLock"],
  ["visual lock normalize helper", characterAssets, "ensureEpisodeVisualLock"],
  ["reference bundle", characterAssets, "buildCharacterReferenceBundle"],
  ["renderer visual lock", generator, "visualLock.characterCapsule"],
  ["legacy noise strip", generator, "progressed by (discovery|escalation|reveal)"],
  ["image text safety", generator, "No readable text"],
  ["meow capsule", meow, "plain round gold pendant"],
  ["storage migration", storage, "ensureEpLocks(normalized)"],
  ["generator UI panel", dailyBatch, "Visual Consistency"],
  ["library UI panel", library, "Visual Consistency"],
  ["package script", packageJson, "validate:visual-continuity"]
]) {
  if (!body.includes(text)) failures.push(`${label} missing: ${text}`);
}

if (/engraved|name tag|badge|MEOW pendant/i.test(meow + generator + characterAssets)) {
  failures.push("forbidden pendant wording remains");
}

if (failures.length) {
  console.error("Visual continuity validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Visual continuity validation passed.");
