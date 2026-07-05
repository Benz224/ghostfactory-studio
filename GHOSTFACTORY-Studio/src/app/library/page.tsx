"use client";

import { Archive, Clipboard, Copy, Edit3, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ImagePicker, ImagePreview } from "@/components/ImagePicker";
import { checklistCounts, checklistForEp } from "@/lib/checklist";
import { copyWithFeedback, type ActionFeedback } from "@/lib/clipboard";
import { FLOW_VIDEO_DURATION_SEC, IMAGE_PROMPT_MAX_CHARS, VIDEO_PROMPT_MAX_CHARS, buildVoiceManifest, ensureEpLocks, renderImagePrompt, renderVideoPrompt, voiceScriptFromManifest } from "@/lib/ep-generator";
import type { EpStatus, GhostCharacter, GhostEp } from "@/lib/types";

type SortMode = "newest" | "oldest" | "viral" | "duration";

const statusOptions: { value: "" | EpStatus; label: string }[] = [
  { value: "", label: "All Status" },
  { value: "idea", label: "Idea" },
  { value: "prompt_ready", label: "Prompt Ready" },
  { value: "frame_ready", label: "Frame Ready" },
  { value: "video_ready", label: "Video Ready" },
  { value: "posted", label: "Posted" },
  { value: "archived", label: "Archived" }
];

function displayDuration(ep: GhostEp) {
  return ep.format || `${ep.durationSec || 0}s`;
}

function framePromptText(ep: GhostEp, frameId?: string) {
  return (ep.frames ?? [])
    .filter((frame) => !frameId || frame.frameId === frameId)
    .filter((frame) => frame.imagePrompt.trim())
    .map((frame) => `${frame.frameId}${frame.title ? ` - ${frame.title}` : ""}\n${renderImagePrompt(ep, frame)}`)
    .join("\n\n");
}

function videoPromptText(ep: GhostEp, videoId?: string) {
  const locked = ensureEpLocks(ep);
  return (locked.videos ?? [])
    .filter((video) => !videoId || video.videoId === videoId)
    .filter((video) => video.videoPrompt.trim())
    .map((video) => `${video.videoId} (${video.fromFrame} -> ${video.toFrame}, ${video.durationSec}s)\n${renderVideoPrompt(locked, video)}`)
    .join("\n\n");
}

function packageText(ep: GhostEp) {
  return [
    `${ep.id} ${ep.title}`,
    `Duration: ${displayDuration(ep)}`,
    `Category: ${ep.category}`,
    `Character: ${ep.characterName}`,
    `Template: ${ep.templateName}`,
    `Date: ${ep.date}`,
    "",
    "Hook",
    ep.hook,
    "",
    "Story",
    ep.story,
    "",
    "Frames",
    framePromptText(ep),
    "",
    "Videos",
    videoPromptText(ep),
    "",
    "Voice Script",
    voiceScriptFromManifest(buildVoiceManifest(ep)),
    "",
    "Caption",
    `${ep.caption}\n${(ep.hashtags ?? []).join(" ")}`
  ].join("\n");
}

function timingPlanText(ep: GhostEp) {
  const locked = ensureEpLocks(ep);
  return locked.videos
    .map((video) => [
      `${video.videoId} (${video.fromFrame} -> ${video.toFrame}, ${video.durationSec}s)`,
      ...(video.timingPlan?.beats ?? []).map((beat) => `${beat.startSec.toFixed(1)}-${beat.endSec.toFixed(1)}s ${beat.action} | ${beat.visualChange}`)
    ].join("\n"))
    .join("\n\n");
}

function Feedback({ feedback }: { feedback: ActionFeedback | null }) {
  if (!feedback) return null;
  const tone =
    feedback.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
    feedback.kind === "error" ? "border-red-200 bg-red-50 text-red-700" :
    feedback.kind === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" :
    "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]";
  return <div className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${tone}`}>{feedback.message}</div>;
}

function EpDetailModal({
  ep,
  onClose,
  onCopy,
  onDuplicate,
  onSaveEp,
  onArchive
}: {
  ep: GhostEp;
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
  onDuplicate: (ep: GhostEp) => void;
  onSaveEp: (ep: GhostEp) => void;
  onArchive: (ep: GhostEp) => void;
}) {
  const [draft, setDraft] = useState({ ...ep, checklist: checklistForEp(ep) });
  const [editMode, setEditMode] = useState(false);
  const checklist = checklistForEp(draft);
  const lockedDraft = ensureEpLocks(draft);
  const manifest = buildVoiceManifest(lockedDraft);
  const voiceScript = voiceScriptFromManifest(manifest);
  const visualLock = lockedDraft.visualLock;
  const voiceLock = lockedDraft.voiceLock;
  const firstTimingPlan = lockedDraft.videos[0]?.timingPlan;

  function updateDraft(patch: Partial<GhostEp>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function setFrame(frameId: string, value: boolean) {
    setDraft({ ...draft, checklist: { ...checklist, frames: { ...checklist.frames, [frameId]: value } } });
  }

  function setVideo(videoId: string, value: boolean) {
    setDraft({ ...draft, checklist: { ...checklist, videos: { ...checklist.videos, [videoId]: value } } });
  }

  function updateFrame(frameId: string, patch: Partial<GhostEp["frames"][number]>) {
    updateDraft({ frames: draft.frames.map((frame) => frame.frameId === frameId ? { ...frame, ...patch } : frame) });
  }

  function updateVideo(videoId: string, patch: Partial<GhostEp["videos"][number]>) {
    updateDraft({ videos: draft.videos.map((video) => video.videoId === videoId ? { ...video, ...patch } : video) });
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/30 p-3 backdrop-blur-sm md:p-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[12px] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#64748B]">
              <span>{draft.id}</span>
              <span>{displayDuration(draft)}</span>
              <span>{draft.status}</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold">{draft.title || draft.id}</h2>
          </div>
          <div className="flex gap-2">
            <button className="btn px-3" onClick={() => setEditMode((value) => !value)} type="button"><Edit3 size={18} />{editMode ? "Preview" : "Edit"}</button>
            <button className="btn px-3" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
          </div>
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto p-5">
          {editMode ? (
            <section className="grid gap-4 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 lg:grid-cols-[260px,1fr]">
              <ImagePicker
                label="EP Image"
                note="Use this as the image for this EP."
                value={draft.thumbnailImage}
                onChange={(thumbnailImage) => updateDraft({ thumbnailImage })}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold md:col-span-2">Title<input className="control mt-1" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} /></label>
                <label className="text-sm font-semibold">Category<input className="control mt-1" value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })} /></label>
                <label className="text-sm font-semibold">Status
                  <select className="control mt-1" value={draft.status} onChange={(event) => updateDraft({ status: event.target.value as EpStatus })}>
                    {statusOptions.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold md:col-span-2">Hook<textarea className="control mt-1 min-h-24" value={draft.hook} onChange={(event) => updateDraft({ hook: event.target.value })} /></label>
                <label className="text-sm font-semibold md:col-span-2">Story<textarea className="control mt-1 min-h-32" value={draft.story} onChange={(event) => updateDraft({ story: event.target.value })} /></label>
                <label className="text-sm font-semibold md:col-span-2">Voice Script<textarea className="control mt-1 min-h-36" value={draft.voiceScript} onChange={(event) => updateDraft({ voiceScript: event.target.value })} /></label>
                <label className="text-sm font-semibold md:col-span-2">Caption<textarea className="control mt-1 min-h-28" value={draft.caption} onChange={(event) => updateDraft({ caption: event.target.value })} /></label>
                <label className="text-sm font-semibold md:col-span-2">Hashtags<input className="control mt-1" value={(draft.hashtags ?? []).join(" ")} onChange={(event) => updateDraft({ hashtags: event.target.value.split(/\s+/).filter(Boolean).map((tag) => tag.startsWith("#") ? tag : `#${tag}`) })} /></label>
              </div>
            </section>
          ) : draft.thumbnailImage ? (
            <section className="max-w-sm">
              <ImagePreview className="aspect-video" label="EP Image" src={draft.thumbnailImage} />
            </section>
          ) : null}

          <section>
            <h3 className="mb-3 font-semibold">General</h3>
            <div className="grid gap-3 text-sm md:grid-cols-5">
              <div className="rounded-[8px] bg-[#F8FAFC] p-3"><div className="text-xs text-[#64748B]">Category</div><div className="font-semibold">{draft.category}</div></div>
              <div className="rounded-[8px] bg-[#F8FAFC] p-3"><div className="text-xs text-[#64748B]">Character</div><div className="font-semibold">{draft.characterName}</div></div>
              <div className="rounded-[8px] bg-[#F8FAFC] p-3"><div className="text-xs text-[#64748B]">Template</div><div className="font-semibold">{draft.templateName}</div></div>
              <div className="rounded-[8px] bg-[#F8FAFC] p-3"><div className="text-xs text-[#64748B]">Duration</div><div className="font-semibold">{displayDuration(draft)}</div></div>
              <div className="rounded-[8px] bg-[#F8FAFC] p-3"><div className="text-xs text-[#64748B]">Date</div><div className="font-semibold">{draft.date}</div></div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <h3 className="mb-3 font-semibold">Visual Consistency</h3>
              <div className="space-y-1 text-xs leading-5 text-[#64748B]">
                <div><strong>Visual Lock ID:</strong> {visualLock?.visualLockId || "-"}</div>
                <div><strong>Character Capsule:</strong> {visualLock?.characterCapsule || "-"}</div>
                <div><strong>Reference Images:</strong> {visualLock?.referenceImageUrls.length || 0}</div>
                <div><strong>Continuity Reference:</strong> {visualLock?.continuityAnchor || visualLock?.primaryLocation || "-"}</div>
                <div><strong>Mode:</strong> {visualLock?.referenceImageUrls.length ? "Reference-guided" : "Text-guided"}</div>
                <div><strong>Status:</strong> {visualLock?.locked ? "Locked" : "Unlocked"}</div>
              </div>
              {!visualLock?.referenceImageUrls.length ? <p className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-700">No character image reference is configured. Visual identity is text-guided only.</p> : null}
            </div>
            <div className="rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Episode Voice Master</h3>
                <button className="btn h-9 px-3" onClick={() => onCopy(JSON.stringify(manifest, null, 2), `Copy Voice Manifest ${draft.id}`)} type="button"><Clipboard size={15} />Copy Manifest</button>
              </div>
              <div className="space-y-1 text-xs leading-5 text-[#64748B]">
                <div><strong>Voice Lock ID:</strong> {voiceLock?.voiceLockId || "-"}</div>
                <div><strong>Mode:</strong> {voiceLock?.renderMode === "native_video" ? "Native Video Voice" : "External TTS"}</div>
                <div><strong>Preset:</strong> {voiceLock?.preset || "-"}</div>
                <div><strong>Provider:</strong> {voiceLock?.provider || "manual"}</div>
                <div><strong>Provider Voice ID:</strong> {voiceLock?.providerVoiceId || "Not set"}</div>
                <div><strong>Reference Audio:</strong> {voiceLock?.referenceAudioUrl || "Not set"}</div>
                <div><strong>Status:</strong> {voiceLock?.providerVoiceId || voiceLock?.referenceAudioUrl || draft.language === "No Dialogue" ? "Ready" : "Voice source required before final TTS export"}</div>
              </div>
              {draft.language !== "No Dialogue" && voiceLock?.renderMode === "external_tts" && !voiceLock.providerVoiceId && !voiceLock.referenceAudioUrl ? <p className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-700">External TTS needs a provider voice ID or reference audio before final voice production.</p> : null}
            </div>
          </section>

          <section className="rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold">Flow Timeline</h3>
              <button className="btn h-9 px-3" onClick={() => onCopy(timingPlanText(lockedDraft), `Copy Timeline ${draft.id}`)} type="button"><Clipboard size={15} />Copy Timeline</button>
            </div>
            <div className="grid gap-2 text-xs leading-5 text-[#64748B] md:grid-cols-2">
              <div><strong>Provider Duration:</strong> {FLOW_VIDEO_DURATION_SEC}s fixed</div>
              <div><strong>Story Timeline:</strong> {firstTimingPlan?.providerDurationSec ?? FLOW_VIDEO_DURATION_SEC}s planned</div>
              {(firstTimingPlan?.beats ?? []).map((beat) => <div key={`${beat.startSec}-${beat.endSec}`}><strong>{beat.startSec.toFixed(1)}-{beat.endSec.toFixed(1)}s</strong> {beat.action}</div>)}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[8px] border border-[#E2E8F0] p-4">
              <h3 className="font-semibold">Hook</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{draft.hook || "No hook."}</p>
            </div>
            <div className="rounded-[8px] border border-[#E2E8F0] p-4">
              <h3 className="font-semibold">Story</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{draft.story || "No story."}</p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Frames</h3>
              <button className="btn h-9 px-3" onClick={() => onCopy(framePromptText(draft), `Copy All Frames ${draft.id}`)} type="button"><Copy size={15} />Copy All Frames</button>
            </div>
            {(draft.frames ?? []).map((frame) => {
              const frameImage = draft.frameImages?.[frame.frameId];
              return (
                <article className="rounded-[8px] border border-[#E2E8F0] p-4" key={frame.frameId}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input checked={Boolean(checklist.frames[frame.frameId])} onChange={(event) => setFrame(frame.frameId, event.target.checked)} type="checkbox" />
                      {frame.frameId} {frame.title}
                    </label>
                    <button className="btn h-9 px-3" onClick={() => onCopy(framePromptText(draft, frame.frameId), `Copy Frame Prompt ${frame.frameId}`)} type="button">Copy Frame Prompt</button>
                  </div>
                  {editMode ? (
                    <div className="grid gap-4 md:grid-cols-[220px,1fr]">
                      <ImagePicker
                        label={`${frame.frameId} Image`}
                        note="Optional image for this frame."
                        value={frameImage ?? ""}
                        onChange={(value) => updateDraft({ frameImages: { ...(draft.frameImages ?? {}), [frame.frameId]: value } })}
                      />
                      <div className="space-y-3">
                        <input className="control" value={frame.title} onChange={(event) => updateFrame(frame.frameId, { title: event.target.value })} placeholder="Frame title" />
                        <textarea className="control min-h-36" value={frame.imagePrompt} onChange={(event) => updateFrame(frame.frameId, { imagePrompt: event.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div className={frameImage ? "grid gap-3 md:grid-cols-[180px,minmax(0,1fr)]" : "block"}>
                      {frameImage ? <ImagePreview className="aspect-square" label={`${frame.frameId} Image`} src={frameImage} /> : null}
                      {frame.imagePrompt ? <div className="mb-2 text-[11px] font-semibold text-[#94A3B8]">Image prompt: {renderImagePrompt(draft, frame).length} / {IMAGE_PROMPT_MAX_CHARS} chars</div> : null}
                      <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-[#64748B]">{frame.imagePrompt ? renderImagePrompt(draft, frame) : "No frame prompt."}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Videos</h3>
              <button className="btn h-9 px-3" onClick={() => onCopy(videoPromptText(draft), `Copy All Videos ${draft.id}`)} type="button"><Clipboard size={15} />Copy All Videos</button>
            </div>
            {(draft.videos ?? []).map((video) => (
              <article className="rounded-[8px] border border-[#E2E8F0] p-4" key={video.videoId}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input checked={Boolean(checklist.videos[video.videoId])} onChange={(event) => setVideo(video.videoId, event.target.checked)} type="checkbox" />
                    {video.videoId} {video.fromFrame} to {video.toFrame} ({video.durationSec}s)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {video.durationSec === 8 ? <span className="rounded-full bg-[#ECFDF5] px-2 py-1 text-[11px] font-semibold text-[#047857]">8s Story Timeline</span> : null}
                    <span className="rounded-full bg-[#EFF6FF] px-2 py-1 text-[11px] font-semibold text-[#2563EB]">Voice Continuity Lock</span>
                  </div>
                  <button className="btn h-9 px-3" onClick={() => onCopy(videoPromptText(draft, video.videoId), `Copy Video Prompt ${video.videoId}`)} type="button">Copy Video Prompt</button>
                </div>
                {editMode ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <input className="control" value={video.fromFrame} onChange={(event) => updateVideo(video.videoId, { fromFrame: event.target.value })} placeholder="From frame" />
                    <input className="control" value={video.toFrame} onChange={(event) => updateVideo(video.videoId, { toFrame: event.target.value })} placeholder="To frame" />
                    <input className="control" min="1" type="number" value={video.durationSec} onChange={(event) => updateVideo(video.videoId, { durationSec: Number(event.target.value) })} />
                    <textarea className="control min-h-32 md:col-span-3" value={video.videoPrompt} onChange={(event) => updateVideo(video.videoId, { videoPrompt: event.target.value })} />
                    <input className="control" value={video.camera} onChange={(event) => updateVideo(video.videoId, { camera: event.target.value })} placeholder="Camera" />
                    <input className="control" value={video.motion} onChange={(event) => updateVideo(video.videoId, { motion: event.target.value })} placeholder="Motion" />
                    <input className="control" value={video.audio} onChange={(event) => updateVideo(video.videoId, { audio: event.target.value })} placeholder="Audio" />
                    <input className="control md:col-span-2" value={video.dialogue} onChange={(event) => updateVideo(video.videoId, { dialogue: event.target.value })} placeholder="Dialogue" />
                    <input className="control" value={video.mood} onChange={(event) => updateVideo(video.videoId, { mood: event.target.value })} placeholder="Mood" />
                  </div>
                ) : (
                  <>
                  {video.videoPrompt ? <div className="mb-2 text-[11px] font-semibold text-[#94A3B8]">Video prompt: {renderVideoPrompt(draft, video).length} / {VIDEO_PROMPT_MAX_CHARS} chars</div> : null}
                  <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-[#64748B]">{video.videoPrompt ? renderVideoPrompt(draft, video) : "No video prompt."}</p>
                  </>
                )}
              </article>
            ))}
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-[8px] border border-[#E2E8F0] p-3 text-sm font-semibold">
              <input checked={checklist.editedDone} onChange={(event) => setDraft({ ...draft, checklist: { ...checklist, editedDone: event.target.checked } })} type="checkbox" />Edited
            </label>
            <label className="flex items-center gap-2 rounded-[8px] border border-[#E2E8F0] p-3 text-sm font-semibold">
              <input checked={checklist.postedDone} onChange={(event) => setDraft({ ...draft, checklist: { ...checklist, postedDone: event.target.checked } })} type="checkbox" />Posted
            </label>
          </section>
        </main>

        <footer className="grid gap-2 border-t border-[#E2E8F0] p-5 sm:grid-cols-5">
          <button className="btn" onClick={() => onCopy(packageText(draft), `Copy Entire EP ${draft.id}`)} type="button"><Copy size={15} />Copy Entire EP</button>
          <button className="btn" onClick={() => onDuplicate(draft)} type="button">Duplicate</button>
          <button className="btn" onClick={() => onArchive(draft)} type="button"><Archive size={15} />Archive</button>
          <button className="btn btn-primary" onClick={() => onSaveEp(draft)} type="button"><Save size={15} />Save EP</button>
          <button className="btn" onClick={onClose} type="button">Close</button>
        </footer>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [eps, setEps] = useState<GhostEp[]>([]);
  const [characters, setCharacters] = useState<GhostCharacter[]>([]);
  const [selectedEp, setSelectedEp] = useState<GhostEp | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [searchText, setSearchText] = useState("");
  const [characterFilter, setCharacterFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | EpStatus>("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  async function load() {
    try {
      const [libraryResponse, charactersResponse] = await Promise.all([fetch("/api/library", { cache: "no-store" }), fetch("/api/characters", { cache: "no-store" })]);
      const [libraryData, charactersData] = await Promise.all([libraryResponse.json(), charactersResponse.json()]);
      const nextEps = (libraryData.eps ?? []).map((ep: GhostEp) => ({ ...ep, checklist: checklistForEp(ep) }));
      setEps(nextEps);
      setCharacters(charactersData.characters ?? []);
      const epId = new URLSearchParams(window.location.search).get("ep");
      const matched = epId ? nextEps.find((ep: GhostEp) => ep.id === epId) : null;
      if (matched) setSelectedEp(matched);
      setFeedback({ kind: "success", message: `Library loaded: ${nextEps.length} EP` });
    } catch (error) {
      setFeedback({ kind: "error", message: `Library load failed: ${(error as Error).message}` });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const characterNames = useMemo(() => [...new Set(eps.map((ep) => ep.characterName).filter(Boolean))], [eps]);
  const categories = useMemo(() => [...new Set(eps.map((ep) => ep.category).filter(Boolean))], [eps]);

  const filtered = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    return eps
      .filter((ep) => {
        const haystack = `${ep.title} ${ep.characterName} ${ep.category} ${ep.templateName}`.toLowerCase();
        return (
          (!query || haystack.includes(query)) &&
          (!characterFilter || ep.characterName === characterFilter) &&
          (!categoryFilter || ep.category === categoryFilter) &&
          (!statusFilter || ep.status === statusFilter) &&
          (!dateFilter || ep.date === dateFilter)
        );
      })
      .sort((a, b) => {
        if (sortMode === "oldest") return a.createdAt.localeCompare(b.createdAt);
        if (sortMode === "viral") return Number(b.viralScore || 0) - Number(a.viralScore || 0);
        if (sortMode === "duration") return Number(b.durationSec || 0) - Number(a.durationSec || 0);
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [categoryFilter, characterFilter, dateFilter, eps, searchText, sortMode, statusFilter]);

  async function updateEp(ep: GhostEp) {
    const response = await fetch("/api/update-ep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epId: ep.id, patch: ep })
    });
    const data = await response.json();
    if (!response.ok) {
      setFeedback({ kind: "error", message: data.error ?? "Save failed" });
      return;
    }
    setEps((current) => current.map((item) => item.id === data.ep.id ? data.ep : item));
    setSelectedEp(data.ep);
    setFeedback({ kind: "success", message: "EP saved" });
  }

  async function archiveEp(ep: GhostEp) {
    await updateEp({ ...ep, status: "archived" });
  }

  async function duplicateEp(ep: GhostEp) {
    const response = await fetch("/api/duplicate-ep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epId: ep.id })
    });
    const data = await response.json();
    if (!response.ok) {
      setFeedback({ kind: "error", message: data.error ?? "Duplicate failed" });
      return;
    }
    setEps((current) => [data.ep, ...current]);
    setSelectedEp(data.ep);
    setFeedback({ kind: "success", message: `Duplicated ${ep.id}` });
  }

  async function deleteEpisode(epId: string) {
    if (!window.confirm("Are you sure you want to delete this EP?")) return;
    const response = await fetch(`/api/library/${encodeURIComponent(epId)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setFeedback({ kind: "error", message: data.error ?? "Delete failed" });
      return;
    }
    setEps((current) => current.filter((ep) => ep.id !== epId));
    setSelectedEp((current) => current?.id === epId ? null : current);
    setFeedback({ kind: "success", message: "Deleted successfully" });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#2563EB]">Library</p>
          <h1 className="text-3xl font-semibold">EP Library</h1>
        </div>
        <button className="btn" onClick={load} type="button"><RefreshCw size={16} />Refresh</button>
      </div>

      <section className="panel grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3.5 text-[#94A3B8]" size={17} />
          <input className="control pl-10" placeholder="Search title, character, category, template" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </label>
        <select className="control" value={characterFilter} onChange={(event) => setCharacterFilter(event.target.value)}>
          <option value="">All Characters</option>
          {characterNames.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="control" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="">All Categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | EpStatus)}>
          {statusOptions.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
        </select>
        <input className="control" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" />
        <select className="control xl:col-span-2" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="viral">Highest Viral Score</option>
          <option value="duration">Duration</option>
        </select>
      </section>

      <Feedback feedback={feedback} />

      <section className="overflow-hidden rounded-[8px] border border-[#E2E8F0] bg-white">
        {filtered.map((ep) => {
          const checklist = checklistForEp(ep);
          const counts = checklistCounts(checklist);
          const character = characters.find((item) => item.id === ep.characterId);
          return (
            <article className="grid cursor-pointer gap-3 border-b border-[#E2E8F0] p-4 transition last:border-b-0 hover:bg-[#F8FAFC] lg:grid-cols-[84px_minmax(220px,1fr)_150px_150px_190px_160px]" key={ep.id} onClick={() => setSelectedEp({ ...ep, checklist })}>
              <ImagePreview className="aspect-square rounded-[8px]" label="EP Image" src={ep.thumbnailImage || Object.values(ep.frameImages ?? {}).find(Boolean)} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-[#0F172A]">{ep.id}</h2>
                  <span className="soft-badge">{ep.status}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-[#334155]">{ep.title || "Untitled EP"}</p>
                <p className="mt-1 text-xs text-[#64748B]">Date: {ep.date}</p>
              </div>
              <div className="text-sm">
                <div><span className="text-[#64748B]">Duration:</span> <strong>{displayDuration(ep)}</strong></div>
                <div><span className="text-[#64748B]">Category:</span> <strong>{ep.category}</strong></div>
              </div>
              <div className="text-sm">
                <div><span className="text-[#64748B]">Character:</span> <strong>{ep.characterName}</strong></div>
                <div><span className="text-[#64748B]">Template:</span> <strong>{ep.templateName}</strong></div>
              </div>
              <div className="text-sm">
                <div>Frames: <strong>{ep.frames.length}</strong></div>
                <div>Videos: <strong>{ep.videos.length}</strong></div>
                <div className="text-xs text-[#64748B]">{character?.imagePath ? "Character image optimized" : ""}</div>
              </div>
              <div className="text-sm">
                <div>Images <strong>{counts.framesDone}/{counts.framesTotal}</strong></div>
                <div>Videos <strong>{counts.videosDone}/{counts.videosTotal}</strong></div>
                <div>Edited {checklist.editedDone ? "✓" : "✗"} / Posted {checklist.postedDone ? "✓" : "✗"}</div>
                <div className="mt-2 flex gap-2">
                  <button className="btn h-8 px-3" onClick={(event) => { event.stopPropagation(); setSelectedEp({ ...ep, checklist }); }} type="button"><Edit3 size={14} />Open</button>
                  <button className="btn h-8 px-3 text-red-600" onClick={(event) => { event.stopPropagation(); void deleteEpisode(ep.id); }} type="button"><Trash2 size={14} /></button>
                </div>
              </div>
            </article>
          );
        })}
        {!filtered.length ? <div className="p-8 text-center text-sm text-[#64748B]">No saved EP matches the current filters.</div> : null}
      </section>

      {selectedEp ? (
        <EpDetailModal
          ep={selectedEp}
          onClose={() => setSelectedEp(null)}
          onCopy={(text, label) => copyWithFeedback(text, label, setFeedback)}
          onDuplicate={(ep) => void duplicateEp(ep)}
          onSaveEp={(ep) => void updateEp(ep)}
          onArchive={(ep) => void archiveEp(ep)}
        />
      ) : null}
    </div>
  );
}
