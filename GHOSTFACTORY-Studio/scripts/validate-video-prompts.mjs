import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const root = cwd();
const files = {
  generator: readFileSync(join(root, "src/lib/ep-generator.ts"), "utf8"),
  storage: readFileSync(join(root, "src/lib/storage.ts"), "utf8"),
  dailyBatch: readFileSync(join(root, "src/components/DailyBatchView.tsx"), "utf8"),
  library: readFileSync(join(root, "src/app/library/page.tsx"), "utf8")
};

const requiredRendererText = [
  "Create one continuous vertical 9:16 cinematic video clip",
  "Action timeline:",
  "0-2s:",
  "2-4s:",
  "4-6s:",
  "6-8s:",
  "VOICE CONTINUITY LOCK:",
  "Do not change voice actor.",
  "No background music by default",
  "Continue using the exact same voice from all previous clips",
  "No spoken voice and no narration should be generated",
  "dialogue must remain empty and voiceScript must remain empty",
  "renderVideoBeatTimeline"
];

const requiredSurfaceText = [
  ["storage exports current renderer", files.storage, "renderVideoPrompt(ep, video)"],
  ["generator video badge", files.dailyBatch, "8s Story Timeline"],
  ["generator voice badge", files.dailyBatch, "Voice Continuity Lock"],
  ["library video badge", files.library, "8s Story Timeline"],
  ["library voice badge", files.library, "Voice Continuity Lock"]
];

const failures = [];

for (const text of requiredRendererText) {
  if (!files.generator.includes(text)) {
    failures.push(`renderer missing: ${text}`);
  }
}

for (const [label, body, text] of requiredSurfaceText) {
  if (!body.includes(text)) {
    failures.push(`${label} missing: ${text}`);
  }
}

if (!/if \(ep\.language === "No Dialogue"\)[\s\S]*dialogue: ""/.test(files.generator)) {
  failures.push("No Dialogue guard does not clear video dialogue");
}

if (!/if \(language === "No Dialogue"\) return "";/.test(files.generator)) {
  failures.push("No Dialogue guard does not clear voiceScript");
}

if (failures.length) {
  console.error("Video prompt validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Video prompt validation passed.");
