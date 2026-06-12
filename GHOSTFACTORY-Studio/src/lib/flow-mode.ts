import type { GhostEp } from "./types";

type Frame = GhostEp["frames"][number];
type Video = GhostEp["videos"][number];

const PLACEHOLDERS = [
  "same continuous scene",
  "same time of day",
  "main story prop",
  "continuity anchor",
  "continuous cinematic camera",
  "cinematic angle",
  "cinematic lighting",
  "initial beat position",
  "progressed by",
  "From the previous beat",
  "hook / anomaly / setup",
  "first action / first evidence",
  "realization / complication",
  "final approach / tension peak",
  "payoff / unresolved ending / result"
];

function cleanWhitespace(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function removeInternalPlaceholders(text = "") {
  return PLACEHOLDERS.reduce((next, placeholder) => {
    const pattern = new RegExp(`\\b${placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    return next.replace(pattern, "");
  }, text)
    .replace(/\bSECTION\s+[A-I]\b.*?:/gi, "")
    .replace(/\b(JSON schema|Output Rules|Episode Memory Summary|Quality Review|Prompt Scope|Batch Settings|Content Draft Rules)\b:?/gi, "")
    .replace(/ตอบเป็น JSON เท่านั้น/gi, "")
    .replace(/\b(main prop|main object)\s*:\s*$/gim, "")
    .replace(/[ \t]*[,;:][ \t]*(?=\n|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeFlowText(text = "") {
  return cleanWhitespace(removeInternalPlaceholders(text));
}

export function compressForFlow(text = "", maxLength = 900) {
  const clean = sanitizeFlowText(text);
  if (clean.length <= maxLength) return clean;
  const clipped = clean.slice(0, maxLength);
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"), clipped.lastIndexOf("。"));
  return `${(sentenceEnd > maxLength * 0.55 ? clipped.slice(0, sentenceEnd + 1) : clipped).trim()}`;
}

function paragraph(lines: Array<string | undefined | false>) {
  return lines.map((line) => sanitizeFlowText(line || "")).filter(Boolean).join("\n");
}

function characterName(ep: GhostEp) {
  return sanitizeFlowText(ep.characterName || "Meow") || "Meow";
}

function referenceChainForFrame(frameId: string) {
  const number = Number(frameId.match(/\d+/)?.[0] ?? 1);
  const exact: Record<number, string[]> = {
    1: ["@Meow"],
    2: ["@Meow", "@F1"],
    3: ["@Meow", "@F1", "@F2"],
    4: ["@Meow", "@F1", "@F2", "@F3"],
    5: ["@Meow", "@F2", "@F3", "@F4"],
    6: ["@Meow", "@F3", "@F4", "@F5"]
  };
  if (exact[number]) return exact[number].join(" + ");
  const refs = Array.from({ length: 3 }, (_, index) => `@F${Math.max(1, number - 3 + index)}`);
  return ["@Meow", ...refs].join(" + ");
}

export function createFlowFrameReferenceLine(frameId: string) {
  return `Attach: ${referenceChainForFrame(frameId)}`;
}

export function createFlowReferencePlan(ep: GhostEp) {
  const frameLines = (ep.frames ?? []).map((frame) => `- ${frame.frameId}${frame.title ? ` - ${sanitizeFlowText(frame.title)}` : ""}: ${createFlowFrameReferenceLine(frame.frameId)}`);
  const videoLines = (ep.videos ?? []).map((video) => `- ${video.videoId}: First Frame ${video.fromFrame} -> Last Frame ${video.toFrame}, ${Number(video.durationSec || 0) || "default"}s`);
  return cleanWhitespace(`# Google Flow Reference Plan

EP: ${sanitizeFlowText(ep.title || ep.id)}
Character reference: @Meow

Warning:
Use exported single images only. Do not use screenshots, contact sheets, UI overlays, black borders, or multiple-image grids as references.

Frame reference chain:
${frameLines.join("\n") || "- No frames available."}

Video chain:
${videoLines.join("\n") || "- No videos available."}

Workflow:
1. Generate frames one by one in Google Flow using the listed references.
2. Generate videos with First Frame / Last Frame only.
3. Track selected assets, notes, and status in Library.`);
}

export function createFlowCharacterLock(ep: GhostEp) {
  const name = characterName(ep);
  const anchor = sanitizeFlowText(ep.characterAnchor || "");
  const specificAnchor = anchor ? ` Character anchor: ${compressForFlow(anchor, 260)}` : "";
  return `Use the uploaded character reference image as the exact visual identity for ${name}.
${name} must remain the same fluffy orange tabby cat in every image and video: same big round eyes, same orange striped fur pattern, same face shape, same body size, same tail, same whiskers, same collar and tag if present.${specificAnchor}
Do not change species. Do not make ${name} human. Do not change fur color. Do not change facial proportions.`;
}

export function createFlowGlobalStyle(ep?: GhostEp) {
  const style = sanitizeFlowText(ep?.episodeState?.lightingStyle || ep?.episodeState?.lighting || "");
  return compressForFlow(
    [
      "Pixar-quality 3D animation, cinematic lighting, premium commercial quality, ultra detailed fluffy fur, shallow depth of field, vertical 9:16.",
      style
    ].filter(Boolean).join(" "),
    320
  );
}

export function createFlowNegativeRules() {
  return "No subtitles. No captions. No text overlay. No watermark. No logo. No UI. No comic panels. No storyboard grid. No collage. No split screen. Generate one image or one video clip only.";
}

function epContext(ep: GhostEp) {
  return paragraph([
    ep.title ? `EP title: ${ep.title}` : "",
    ep.hook ? `Hook: ${compressForFlow(ep.hook, 180)}` : "",
    ep.story ? `Story context: ${compressForFlow(ep.story, 360)}` : ""
  ]);
}

function sceneContinuity(ep: GhostEp) {
  const state = ep.episodeState;
  const concrete = paragraph([
    state?.primaryLocation || state?.location ? `Location: ${state.primaryLocation || state.location}` : "",
    state?.mainProps || state?.props ? `Main props: ${state.mainProps || state.props}` : "",
    state?.visualAnchor ? `Visual anchor: ${state.visualAnchor}` : ""
  ]);
  return [
    "SCENE CONTINUITY:",
    concrete || "Preserve the same location, background layout, lighting direction, main props, camera axis, object positions, and visual style shown in the selected reference frames and described in this EP.",
    "",
    "MAIN PROPS:",
    "Preserve the concrete props described in this EP and this frame. Do not replace, remove, or randomly transform them."
  ].join("\n");
}

function frameScene(ep: GhostEp, frame: Frame) {
  const visualState = ep.visualStates?.find((state) => state.frameId === frame.frameId);
  return compressForFlow(paragraph([
    `${frame.frameId}${frame.title ? ` - ${frame.title}` : ""}`,
    frame.imagePrompt,
    visualState?.actionState ? `Action: ${visualState.actionState}` : "",
    visualState?.locationLayout ? `Location layout: ${visualState.locationLayout}` : "",
    visualState?.mainPropPosition ? `Main prop position: ${visualState.mainPropPosition}` : ""
  ]) || "Use the current frame title and EP story to create this keyframe. Preserve the selected character, the same location, the same main props, and the action described by this frame.", 950);
}

function laterFrameText(ep: GhostEp, currentFrameId: string) {
  const index = ep.frames.findIndex((frame) => frame.frameId === currentFrameId);
  if (index < 0) return "";
  return ep.frames
    .slice(index + 1)
    .map((frame) => `${frame.frameId} ${frame.title} ${frame.imagePrompt}`)
    .map((text) => compressForFlow(text, 180))
    .filter(Boolean)
    .join("; ");
}

function futureRules(ep: GhostEp, frameId: string) {
  const future = laterFrameText(ep, frameId);
  return [
    "Do not show major objects/actions that only appear in later frames.",
    "Do not skip ahead to the payoff.",
    "Do not introduce ending props before they appear in the frame sequence.",
    "Do not change the main prop into a different object.",
    "Do not add unrelated props, humans, extra cats, text, UI, logo, or watermark.",
    future ? `Later-frame content to avoid in this frame: ${future}` : ""
  ].filter(Boolean).join(" ");
}

export function buildFlowFramePrompt(ep: GhostEp, frame: Frame) {
  return cleanWhitespace(`Create only one standalone vertical 9:16 image for ${frame.frameId}.

Reference chain for this frame: ${referenceChainForFrame(frame.frameId)}.
Use these references only for identity and continuity. Generate exactly ONE image, not multiple images.

${createFlowCharacterLock(ep)}

${sceneContinuity(ep)}

Current EP:
${epContext(ep)}

Scene:
${frameScene(ep, frame)}

Continuity and forbidden future events:
${futureRules(ep, frame.frameId)}

Visual style:
${createFlowGlobalStyle(ep)}

Negative rules:
${createFlowNegativeRules()} No background music.`);
}

export const createFlowImagePrompt = buildFlowFramePrompt;

function findFrame(ep: GhostEp, frameId: string) {
  return ep.frames.find((frame) => frame.frameId === frameId);
}

function videoScene(ep: GhostEp, video: Video) {
  const fallback = [
    findFrame(ep, video.fromFrame)?.title,
    findFrame(ep, video.toFrame)?.title,
    ep.story
  ].filter(Boolean).join(" to ");
  return compressForFlow(paragraph([
    video.videoPrompt,
    video.motion ? `Motion detail: ${video.motion}` : "",
    fallback ? `Frame transition context: ${fallback}` : ""
  ]) || "Use the selected first and last frames to create this clip. Preserve the same location, the same main props, and the action described by this video beat.", 1000);
}

export function buildFlowVideoPrompt(ep: GhostEp, video: Video) {
  return cleanWhitespace(`Create one standalone vertical 9:16 video clip only.
Duration: ${Number(video.durationSec || 0) || Math.max(1, Math.round((ep.durationSec || 5) / Math.max(1, ep.videos.length || 1)))} seconds.
This is ${video.videoId} from ${video.fromFrame} to ${video.toFrame}.

Use First Frame ${video.fromFrame} as the exact starting frame.
Use Last Frame ${video.toFrame} as the exact ending frame.
Preserve character identity, scene, props, camera continuity, and object positions between the two frames.

${createFlowCharacterLock(ep)}

${sceneContinuity(ep)}

Scene and action:
${videoScene(ep, video)}

Camera:
${compressForFlow(video.camera || ep.episodeState?.cameraLanguage || ep.episodeState?.camera || "Keep camera continuity from the selected frames.", 260)}

Motion:
${compressForFlow(video.motion || "Use smooth, natural motion that follows the action described in this video beat.", 260)}

Audio:
${compressForFlow(video.audio || ep.episodeState?.environmentAudio || "Use natural scene sound only.", 260)}

Dialogue / voice:
${compressForFlow(video.dialogue || "No dialogue unless explicitly needed by this EP.", 260)}

Mood:
${compressForFlow(video.mood || ep.coreIdea?.emotionTarget || "Cinematic, clear, emotionally consistent with the EP.", 220)}

Visual style:
${createFlowGlobalStyle(ep).replace("shallow depth of field,", "smooth camera movement,")}

Negative rules:
No subtitles. No captions. No text overlay. No watermark. No logo. No UI. No comic panels. No storyboard grid. No collage. No split screen. No new location. No extra cats. No humans unless explicitly described by this EP. No background music unless explicitly requested.`);
}

export const createFlowVideoPrompt = buildFlowVideoPrompt;

export function createFlowOneShotPrompt(ep: GhostEp) {
  const videos = (ep.videos ?? []).map((video) => `- ${video.videoId}: ${video.fromFrame} -> ${video.toFrame}, ${video.durationSec}s. ${compressForFlow(video.videoPrompt || video.motion, 240)}`);
  const frames = (ep.frames ?? []).map((frame) => `- ${frame.frameId}: ${compressForFlow(`${frame.title}. ${frame.imagePrompt}`, 220)}`);
  return cleanWhitespace(`Create a complete vertical 9:16 short video project.

Use the uploaded character reference image as the exact visual identity for ${characterName(ep)}.
Keep the tested reference-chain workflow, but use the actual EP content below.

Story:
${epContext(ep) || compressForFlow(ep.story, 500)}

Video clips:
${videos.join("\n") || "- Create clips from the available EP frame sequence."}

Still keyframes:
${frames.join("\n") || "- Create still keyframes from the available EP frame prompts."}

Continuity:
${sceneContinuity(ep)}

Visual style:
${createFlowGlobalStyle(ep)}

Negative rules:
Use plain production instructions only. No long internal system sections. No subtitles. No captions. No text overlay. No watermark. No logo. Do not create storyboard/collage/panel/grid output. Generate a single vertical 9:16 short video project.`);
}

export function createFlowAllImagesPrompt(ep: GhostEp) {
  return (ep.frames ?? []).map((frame) => buildFlowFramePrompt(ep, frame)).join("\n\n---\n\n");
}

export function createFlowAllVideosPrompt(ep: GhostEp) {
  return (ep.videos ?? []).map((video) => buildFlowVideoPrompt(ep, video)).join("\n\n---\n\n");
}

export function createFlowPromptsJson(ep: GhostEp) {
  return {
    referencePlan: createFlowReferencePlan(ep),
    videos: (ep.videos ?? []).map((video) => ({ videoId: video.videoId, prompt: buildFlowVideoPrompt(ep, video) })),
    images: (ep.frames ?? []).map((frame) => ({ frameId: frame.frameId, prompt: buildFlowFramePrompt(ep, frame) }))
  };
}

export function createFlowNotes(ep: GhostEp) {
  const frames = (ep.frames ?? []).map((frame) => [
    `### ${frame.frameId}${frame.title ? ` - ${sanitizeFlowText(frame.title)}` : ""}`,
    `Status: ${frame.flowStatus ?? "not_started"}`,
    `Selected asset: ${sanitizeFlowText(frame.flowAssetLabel || "")}`,
    `Notes: ${sanitizeFlowText(frame.flowNotes || "")}`
  ].join("\n"));
  const videos = (ep.videos ?? []).map((video) => [
    `### ${video.videoId} (${video.fromFrame} -> ${video.toFrame})`,
    `Status: ${video.flowStatus ?? "not_started"}`,
    `Notes: ${sanitizeFlowText(video.flowNotes || "")}`
  ].join("\n"));
  return cleanWhitespace(`# Google Flow Notes

## Frames
${frames.join("\n\n") || "No frame notes."}

## Videos
${videos.join("\n\n") || "No video notes."}`);
}
