import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const root = cwd();
const types = readFileSync(join(root, "src/lib/types.ts"), "utf8");
const generator = readFileSync(join(root, "src/lib/ep-generator.ts"), "utf8");
const storage = readFileSync(join(root, "src/lib/storage.ts"), "utf8");
const promptTemplate = readFileSync(join(root, "src/lib/prompt-template.ts"), "utf8");
const dailyBatch = readFileSync(join(root, "src/components/DailyBatchView.tsx"), "utf8");
const library = readFileSync(join(root, "src/app/library/page.tsx"), "utf8");
const packageJson = readFileSync(join(root, "package.json"), "utf8");

const failures = [];

for (const [label, body, text] of [
  ["types temporal beat", types, "VideoTemporalBeat"],
  ["types timing plan", types, "VideoTimingPlan"],
  ["video timing field", types, "timingPlan?: VideoTimingPlan"],
  ["flow duration constant", generator, "FLOW_VIDEO_DURATION_SEC = 8"],
  ["flow prompt max", generator, "FLOW_VIDEO_PROMPT_MAX_CHARS = 1250"],
  ["timing builder", generator, "buildVideoTimingPlan"],
  ["four beat start", generator, "startSec: 0"],
  ["four beat end", generator, "endSec: FLOW_VIDEO_DURATION_SEC"],
  ["no scene changes", generator, "no scene changes"],
  ["manifest cumulative", generator, "startSec += durationSec"],
  ["speech start", generator, "speechStartSec = 0.8"],
  ["speech max", generator, "Math.min(6.2"],
  ["creative temporal schema", promptTemplate, '"temporalPlan"'],
  ["storage migration", storage, "durationSec: FLOW_VIDEO_DURATION_SEC"],
  ["timing export", storage, "timing-plan.json"],
  ["generator flow panel", dailyBatch, "Flow Timeline"],
  ["library flow panel", library, "Flow Timeline"],
  ["package script", packageJson, "validate:flow-8s"]
]) {
  if (!body.includes(text)) failures.push(`${label} missing: ${text}`);
}

if (!/Continuous \$\{durationSec\}-second vertical 9:16 cinematic shot, no cuts, no scene changes/.test(generator)) {
  failures.push("Flow/Veo video prompt does not enforce continuous 8s no-cuts no-scene-changes wording");
}

if (!/providerDurationSec:\s*FLOW_VIDEO_DURATION_SEC/.test(generator)) {
  failures.push("timing plan provider duration is not fixed to Flow duration");
}

if (failures.length) {
  console.error("Flow 8-second timeline validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Flow 8-second timeline validation passed.");
