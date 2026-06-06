"use client";

import { Clipboard, FilePlus2, Library, Save, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePreview } from "@/components/ImagePicker";
import { copyWithFeedback, type ActionFeedback } from "@/lib/clipboard";
import { calculateParseHealth, parseDailyResult } from "@/lib/ep-generator";
import { appendHistoryToPrompt, buildGeneratorPrompt, createFullDailyPackagePrompt } from "@/lib/prompt-template";
import type { AffiliateBrief, ContentGoal, DailyBatch, GenerationSetup, GhostCharacter, GhostEp, GhostTemplate, IdeaMemory, Settings, SpokenLanguage } from "@/lib/types";

type Props = {
  characters: GhostCharacter[];
  templates: GhostTemplate[];
  defaultCharacterId: string;
  defaultTemplateId: string;
  settings: Settings;
  basePrompt: string;
  jsonPrompt: string;
  historyPrompt: string;
  history: GhostEp[];
  ideaMemory: IdeaMemory;
};

type SaveState = "unsaved" | "saving" | "saved" | "duplicate" | "error";

const languages: SpokenLanguage[] = ["Thai", "English", "Japanese", "Korean", "Chinese", "No Dialogue"];
const generatorDraftStorageKey = "ghostfactory.generatorDraft.v1";

type GeneratorDraft = {
  affiliateBrief: AffiliateBrief;
  batch: DailyBatch | null;
  characterId: string;
  contentGoal: ContentGoal;
  epSaveStates: Record<string, SaveState>;
  language: SpokenLanguage;
  promptText: string;
  rawResult: string;
  saveState: SaveState;
  savedLibraryId: string | null;
  selectedEpId: string | null;
  sessionPromptVersions: NonNullable<GhostEp["promptVersions"]>;
  templateId: string;
  generationSetup: GenerationSetup;
};

function defaultGenerationSetup(settings: Settings): GenerationSetup {
  return {
    aiMode: "manual",
    autoImageGeneration: false,
    creditMode: settings.creditMode === "normal" ? "medium" : settings.creditMode,
    customFramesEnabled: false,
    durationPerVideoSec: 8,
    duplicateCheckEnabled: true,
    duplicateSimilarityThreshold: settings.duplicateSimilarityThreshold,
    framesPerEpisode: 4,
    framePromptsOnly: true,
    outputRoot: settings.outputRoot,
    saveAfterGeneration: false,
    saveOnlySelectedEp: true,
    totalEpisodes: 3,
    videosPerEpisode: 3
  };
}

function normalizeGenerationSetup(settings: Settings, saved?: Partial<GenerationSetup> & Record<string, unknown>): GenerationSetup {
  const defaults = defaultGenerationSetup(settings);
  const videosPerEpisode = Number(saved?.videosPerEpisode ?? defaults.videosPerEpisode);
  const durationPerVideoSec = Number(saved?.durationPerVideoSec ?? defaults.durationPerVideoSec);
  return {
    ...defaults,
    ...saved,
    customFramesEnabled: Boolean(saved?.customFramesEnabled ?? defaults.customFramesEnabled),
    durationPerVideoSec: Math.max(1, durationPerVideoSec),
    framesPerEpisode: Math.max(2, Number(saved?.framesPerEpisode ?? videosPerEpisode + 1)),
    totalEpisodes: Math.max(1, Number(saved?.totalEpisodes ?? saved?.totalEpCount ?? defaults.totalEpisodes)),
    videosPerEpisode: Math.max(1, videosPerEpisode)
  };
}

function frameText(ep: GhostEp, frameId?: string) {
  const frames = frameId ? ep.frames.filter((frame) => frame.frameId === frameId) : ep.frames;
  return frames
    .filter((frame) => frame.imagePrompt.trim())
    .map((frame) => `${frame.frameId}${frame.title ? ` - ${frame.title}` : ""}\n${frame.imagePrompt}`)
    .join("\n\n");
}

function videoText(ep: GhostEp, videoId?: string) {
  const videos = videoId ? ep.videos.filter((video) => video.videoId === videoId) : ep.videos;
  return videos
    .filter((video) => video.prompt.trim())
    .map((video) => `${video.videoId} (${video.fromFrame} -> ${video.toFrame}, ${video.durationSec}s)\n${video.prompt}\nCamera: ${video.camera}\nMotion: ${video.motion}\nAudio: ${video.audio}\nDialogue: ${video.dialogue}\nMood: ${video.mood}`)
    .join("\n\n");
}

function packageText(ep: GhostEp) {
  return [
    `${ep.id} ${ep.title}`,
    `Language: ${ep.language}`,
    `Thumbnail: ${ep.thumbnailImage ? "Available" : "None"}`,
    `Character: ${ep.characterName}`,
    `Template: ${ep.templateName}`,
    `Goal: ${ep.contentGoal}`,
    `Category: ${ep.category}`,
    `Hook: ${ep.hook}`,
    "",
    "Frames",
    frameText(ep),
    "",
    "Videos",
    videoText(ep),
    "",
    "Voice Script",
    ep.voiceScript,
    "",
    "Sound Effects",
    ep.soundEffects,
    "",
    "Caption",
    `${ep.caption}\n${ep.hashtags.join(" ")}`
  ].join("\n");
}

function Feedback({ feedback }: { feedback: ActionFeedback | null }) {
  if (!feedback) return null;
  const tone =
    feedback.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
    feedback.kind === "error" ? "border-red-200 bg-red-50 text-red-700" :
    feedback.kind === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" :
    "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]";
  return <div className={`rounded-[18px] border px-4 py-3 text-sm font-semibold ${tone}`}>{feedback.message}</div>;
}

function CopyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="btn h-9 px-3 text-xs" onClick={onClick} type="button">Copy {label}</button>;
}

function EpResultModal({
  ep,
  epNumber,
  saveState,
  onClose,
  onSave,
  onCopy
}: {
  ep: GhostEp;
  epNumber: string;
  saveState: SaveState;
  onClose: () => void;
  onSave: (ep: GhostEp) => void;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/30 p-3 backdrop-blur-sm md:p-6">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#64748B]">
              <span>{epNumber}</span>
              <span>{ep.id}</span>
              <span>{ep.format}</span>
              <span>{ep.category}</span>
              <span>{saveState}</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">{ep.title || "Untitled EP"}</h2>
          </div>
          <button className="btn px-3" onClick={onClose} type="button" aria-label="Close"><X size={18} /></button>
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <h3 className="mb-3 font-semibold">Summary</h3>
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-[16px] bg-white p-3"><div className="text-xs text-[#64748B]">Created</div><div className="font-semibold">{ep.date}</div></div>
              <div className="rounded-[16px] bg-white p-3"><div className="text-xs text-[#64748B]">Viral Score</div><div className="font-semibold">{ep.viralScore ?? 0}</div></div>
              <div className="rounded-[16px] bg-white p-3"><div className="text-xs text-[#64748B]">Duration</div><div className="font-semibold">{ep.durationSec ? `${ep.durationSec}s` : ep.format}</div></div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Story</h3>
                <CopyButton label="Story" onClick={() => onCopy(ep.story, `Copy Story ${ep.id}`)} />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{ep.story || "No story."}</p>
            </div>
            <div className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Hook</h3>
                <CopyButton label="Hook" onClick={() => onCopy(ep.hook, `Copy Hook ${ep.id}`)} />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{ep.hook || "No hook."}</p>
            </div>
          </section>

          <section className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <h3 className="mb-3 font-semibold">Frames</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {ep.frames.map((frame) => (
                <article className="rounded-[18px] bg-white p-3" key={frame.frameId}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{frame.frameId} {frame.title}</div>
                    <CopyButton label={frame.frameId} onClick={() => onCopy(frame.imagePrompt, `Copy ${frame.frameId}`)} />
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-5 text-[#64748B]">{frame.imagePrompt}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <h3 className="mb-3 font-semibold">Videos</h3>
            <div className="grid gap-3">
              {ep.videos.map((video) => (
                <article className="rounded-[18px] bg-white p-3" key={video.videoId}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{video.videoId} {video.fromFrame} to {video.toFrame} ({video.durationSec}s)</div>
                    <CopyButton label={video.videoId} onClick={() => onCopy(video.prompt, `Copy ${video.videoId}`)} />
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-5 text-[#64748B]">{video.prompt}</p>
                  <div className="mt-3 grid gap-2 text-xs md:grid-cols-5">
                    <div><strong>Camera:</strong> {video.camera || "-"}</div>
                    <div><strong>Motion:</strong> {video.motion || "-"}</div>
                    <div><strong>Audio:</strong> {video.audio || "-"}</div>
                    <div><strong>Dialogue:</strong> {video.dialogue || "-"}</div>
                    <div><strong>Mood:</strong> {video.mood || "-"}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Voice Script</h3>
                <CopyButton label="Voice" onClick={() => onCopy(ep.voiceScript, `Copy Voice Script ${ep.id}`)} />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{ep.voiceScript || "No voice script."}</p>
            </div>
            <div className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Sound Effects</h3>
                <CopyButton label="SFX" onClick={() => onCopy(ep.soundEffects, `Copy Sound Effects ${ep.id}`)} />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{ep.soundEffects || "No sound effects."}</p>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Caption</h3>
                <CopyButton label="Caption" onClick={() => onCopy(ep.caption, `Copy Caption ${ep.id}`)} />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{ep.caption || "No caption."}</p>
            </div>
            <div className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">Hashtags</h3>
                <CopyButton label="Hashtags" onClick={() => onCopy(ep.hashtags.join(" "), `Copy Hashtags ${ep.id}`)} />
              </div>
              <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-[#2563EB]">{ep.hashtags.join(" ") || "No hashtags."}</p>
            </div>
          </section>
        </main>

        <footer className="grid gap-3 border-t border-[#E2E8F0] p-5 sm:grid-cols-3">
          <button className="btn" onClick={onClose} type="button">Close</button>
          <button className="btn" onClick={() => onCopy(packageText(ep), `Copy All ${ep.id}`)} type="button">Copy All</button>
          <button className="btn btn-primary" disabled={saveState === "saving"} onClick={() => onSave(ep)} type="button"><Save size={16} />{saveState === "saving" ? "Saving..." : "Save to Library"}</button>
        </footer>
      </div>
    </div>
  );
}

export function DailyBatchView({ characters, templates, defaultCharacterId, defaultTemplateId, settings, history, ideaMemory }: Props) {
  const [batch, setBatch] = useState<DailyBatch | null>(null);
  const [rawResult, setRawResult] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [checking, setChecking] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("unsaved");
  const [epSaveStates, setEpSaveStates] = useState<Record<string, SaveState>>({});
  const [savedLibraryId, setSavedLibraryId] = useState<string | null>(null);
  const [selectedEpId, setSelectedEpId] = useState<string | null>(null);
  const [modalEpId, setModalEpId] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [characterId, setCharacterId] = useState(defaultCharacterId);
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [contentGoal, setContentGoal] = useState<ContentGoal>("Entertainment");
  const [language, setLanguage] = useState<SpokenLanguage>("Thai");
  const [generationSetup, setGenerationSetup] = useState<GenerationSetup>(() => defaultGenerationSetup(settings));
  const [promptText, setPromptText] = useState("");
  const [sessionPromptVersions, setSessionPromptVersions] = useState<NonNullable<GhostEp["promptVersions"]>>([]);
  const [affiliateBrief, setAffiliateBrief] = useState<AffiliateBrief>({ productName: "", productProblem: "", productBenefit: "", ctaText: "" });
  const restoredPromptRef = useRef(false);

  const selectedCharacter = useMemo(() => characters.find((character) => character.id === characterId) ?? characters[0], [characters, characterId]);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === templateId) ?? templates[0], [templates, templateId]);
  const currentPrompt = useMemo(
    () => buildGeneratorPrompt({ character: selectedCharacter, template: selectedTemplate, contentGoal, settings, language, generationSetup, affiliateBrief }),
    [affiliateBrief, contentGoal, generationSetup, language, selectedCharacter, selectedTemplate, settings]
  );
  const currentHistoryPrompt = useMemo(() => appendHistoryToPrompt(currentPrompt, history, 50, ideaMemory), [currentPrompt, history, ideaMemory]);
  const currentEp = useMemo(() => {
    if (!batch?.eps?.length) return null;
    return batch.eps.find((ep) => ep.id === selectedEpId) ?? batch.eps[0];
  }, [batch, selectedEpId]);
  const modalEp = useMemo(() => batch?.eps.find((ep) => ep.id === modalEpId) ?? null, [batch, modalEpId]);
  const characterEpCount = history.filter((ep) => ep.characterId === selectedCharacter?.id).length;
  const characterMemoryStatus = selectedCharacter ? "Ready" : "Missing";
  const characterMemory = [
    { label: "Image", status: selectedCharacter?.imageUrl ? "Loaded" : "Missing" },
    { label: "Personality", status: selectedCharacter?.personality?.length ? "Loaded" : "Missing" },
    { label: "Visual Style", status: selectedCharacter?.visualStyle ? "Loaded" : "Missing" },
    { label: "Rules", status: selectedCharacter?.rules?.length ? "Loaded" : "Missing" },
    { label: "Negative Rules", status: selectedCharacter?.negativeRules?.length ? "Loaded" : "Missing" },
    { label: "Voice", status: selectedCharacter?.voicePreset ? "Loaded" : "Optional" },
    { label: "Language", status: selectedCharacter?.defaultLanguage || selectedCharacter?.languagePreference ? "Loaded" : "Optional" },
    { label: "Reference Images", status: selectedCharacter?.referenceImages?.length ? "Loaded" : "Optional" }
  ];
  const videosPerEpisode = Math.max(1, Number(generationSetup.videosPerEpisode || 1));
  const automaticFramesPerEpisode = videosPerEpisode + 1;
  const framesPerEpisode = generationSetup.customFramesEnabled ? Math.max(2, Number(generationSetup.framesPerEpisode || automaticFramesPerEpisode)) : automaticFramesPerEpisode;
  const durationPerVideoSec = Math.max(1, Number(generationSetup.durationPerVideoSec || 8));
  const totalEpisodeDurationSec = videosPerEpisode * durationPerVideoSec;

  const toast = {
    success: (message: string) => setFeedback({ kind: "success", message })
  };

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(generatorDraftStorageKey);
      if (!rawDraft) {
        setPromptText(currentHistoryPrompt);
        setDraftHydrated(true);
        return;
      }
      const draft = JSON.parse(rawDraft) as Partial<GeneratorDraft>;
      setAffiliateBrief({ productName: "", productProblem: "", productBenefit: "", ctaText: "", ...(draft.affiliateBrief ?? {}) });
      setBatch(draft.batch ?? null);
      setCharacterId(draft.characterId ?? defaultCharacterId);
      setContentGoal(draft.contentGoal ?? "Entertainment");
      setEpSaveStates(draft.epSaveStates ?? {});
      setGenerationSetup(normalizeGenerationSetup(settings, draft.generationSetup));
      setLanguage(draft.language ?? "Thai");
      setPromptText(draft.promptText || currentHistoryPrompt);
      setRawResult(draft.rawResult ?? "");
      setSaveState(draft.saveState ?? "unsaved");
      setSavedLibraryId(draft.savedLibraryId ?? null);
      setSelectedEpId(draft.selectedEpId ?? draft.batch?.eps?.[0]?.id ?? null);
      setSessionPromptVersions(Array.isArray(draft.sessionPromptVersions) ? draft.sessionPromptVersions : []);
      setTemplateId(draft.templateId ?? defaultTemplateId);
      restoredPromptRef.current = Boolean(draft.promptText);
      setFeedback({ kind: "success", message: "Restored Generator draft." });
    } catch (error) {
      console.warn("[GF_GENERATOR_DRAFT] restore failed", error);
      setPromptText(currentHistoryPrompt);
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    if (restoredPromptRef.current) {
      restoredPromptRef.current = false;
      return;
    }
    setPromptText(currentHistoryPrompt);
  }, [currentHistoryPrompt, draftHydrated]);

  useEffect(() => {
    if (!draftHydrated) return;
    const draft: GeneratorDraft = {
      affiliateBrief,
      batch,
      characterId,
      contentGoal,
      epSaveStates,
      generationSetup,
      language,
      promptText,
      rawResult,
      saveState,
      savedLibraryId,
      selectedEpId,
      sessionPromptVersions,
      templateId
    };
    try {
      window.localStorage.setItem(generatorDraftStorageKey, JSON.stringify(draft));
    } catch (error) {
      console.warn("[GF_GENERATOR_DRAFT] save failed", error);
    }
  }, [affiliateBrief, batch, characterId, contentGoal, draftHydrated, epSaveStates, generationSetup, language, promptText, rawResult, saveState, savedLibraryId, selectedEpId, sessionPromptVersions, templateId]);

  function selectEp(ep: GhostEp) {
    setSelectedEpId(ep.id);
    setSaveState(epSaveStates[ep.id] ?? (ep.duplicateCheck.isDuplicate ? "duplicate" : "unsaved"));
    setSavedLibraryId(null);
  }

  function replaceEp(nextEp: GhostEp, sourceId = selectedEpId ?? nextEp.id) {
    const withHealth = { ...nextEp, parseHealth: calculateParseHealth(nextEp) };
    setBatch((current) => {
      if (!current) return current;
      let replaced = false;
      const eps = current.eps.map((ep) => {
        if (ep.id === sourceId || ep.id === withHealth.id) {
          replaced = true;
          return withHealth;
        }
        return ep;
      });
      return { ...current, eps: replaced ? eps : [withHealth, ...eps] };
    });
    setSelectedEpId(withHealth.id);
  }

  async function generateBatch() {
    const response = await fetch("/api/generate-daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, templateId, contentGoal, language, generationSetup })
    });
    const nextBatch = (await response.json()) as DailyBatch;
    setBatch({ ...nextBatch, eps: nextBatch.eps.map((ep) => ({ ...ep, language, promptVersions: sessionPromptVersions })) });
    setSelectedEpId(nextBatch.eps[0]?.id ?? null);
    setSaveState("unsaved");
    setEpSaveStates(Object.fromEntries(nextBatch.eps.map((ep) => [ep.id, "unsaved" as SaveState])));
    setSavedLibraryId(null);
    setFeedback({ kind: "success", message: `Created ${nextBatch.eps.length} EP slots in ${language}.` });
  }

  async function checkDuplicateOnly(ep: GhostEp) {
    if (!generationSetup.duplicateCheckEnabled) {
      return { ...ep, duplicateCheck: { isDuplicate: false, similarityScore: 0 } };
    }
    const response = await fetch("/api/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ep, threshold: generationSetup.duplicateSimilarityThreshold })
    });
    return { ...ep, duplicateCheck: await response.json() };
  }

  async function parseResult() {
    if (!rawResult.trim()) {
      setFeedback({ kind: "warning", message: "Paste AI result first." });
      return;
    }
    setChecking(true);
    try {
      const eps = parseDailyResult(rawResult, undefined, { character: selectedCharacter, template: selectedTemplate, contentGoal, language, affiliateBrief });
      if (!eps.length) {
        setFeedback({ kind: "warning", message: "No EP found in pasted result." });
        return;
      }
      const checkedEps = await Promise.all(eps.map((ep) => checkDuplicateOnly({ ...ep, promptVersions: sessionPromptVersions })));
      const nextBatch: DailyBatch = { id: `BATCH-${new Date().toISOString().slice(0, 10)}-PARSED`, date: new Date().toISOString().slice(0, 10), eps: checkedEps, createdAt: new Date().toISOString() };
      setBatch(nextBatch);
      setSelectedEpId(checkedEps[0]?.id ?? null);
      setSaveState(checkedEps[0]?.duplicateCheck.isDuplicate ? "duplicate" : "unsaved");
      setEpSaveStates(Object.fromEntries(checkedEps.map((ep) => [ep.id, ep.duplicateCheck.isDuplicate ? "duplicate" as SaveState : "unsaved" as SaveState])));
      setSavedLibraryId(null);
      if (generationSetup.saveAfterGeneration) {
        const targets = generationSetup.saveOnlySelectedEp ? checkedEps.slice(0, 1) : checkedEps;
        let savedCount = 0;
        for (const ep of targets) {
          if (!ep.duplicateCheck.isDuplicate && !validate(ep)) {
            const result = await saveToLibrary(ep, { skipConfirm: true });
            if (result === "saved") savedCount += 1;
          }
        }
        setFeedback({ kind: savedCount ? "success" : "warning", message: savedCount ? `Parsed ${checkedEps.length} EPs and auto-saved ${savedCount} to Library.` : `Parsed ${checkedEps.length} EPs. Auto Save skipped incomplete or duplicate EPs.` });
      } else {
        setFeedback({ kind: "success", message: `Parsed ${checkedEps.length} EPs. Select a row to compare and use.` });
      }
    } finally {
      setChecking(false);
    }
  }

  function validate(ep: GhostEp) {
    return [!ep.title.trim() && "title", !ep.story.trim() && "story", !ep.hook.trim() && "hook", ep.frames.some((frame) => !frame.imagePrompt.trim()) && "frames", ep.videos.some((video) => !video.prompt.trim()) && "videos", !ep.caption.trim() && "caption", !ep.hashtags.length && "hashtags"].filter(Boolean).join(", ");
  }

  async function saveToLibrary(ep: GhostEp, options: { skipConfirm?: boolean } = {}) {
    const missing = validate(ep);
    if (missing && (options.skipConfirm || !window.confirm(`Missing ${missing}. Save anyway?`))) return "skipped";
    const healthScore = ep.parseHealth?.score ?? 0;
    if (healthScore < 80 && (options.skipConfirm || !window.confirm(`Parse Health is ${healthScore}%. Save anyway?`))) return "skipped";

    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    const createEp: GhostEp = {
      ...ep,
      id: `EP-${date}-${Date.now()}`,
      date,
      status: "prompt_ready",
      language,
      promptVersions: ep.promptVersions?.length ? ep.promptVersions : sessionPromptVersions,
      createdAt: now,
      updatedAt: now
    };

    const sourceId = ep.id;
    console.log("[GF_SAVE_TRACE] start", { draftId: sourceId, newId: createEp.id, title: createEp.title });
    setSaveState("saving");
    setEpSaveStates((current) => ({ ...current, [sourceId]: "saving" }));

    const checked = await checkDuplicateOnly(createEp);
    console.log("[GF_SAVE_TRACE] duplicate-check", checked.duplicateCheck);
    let allowDuplicateSave = false;
    if (checked.duplicateCheck.isDuplicate) {
      if (options.skipConfirm) {
        replaceEp(checked, sourceId);
        setSaveState("duplicate");
        setEpSaveStates((current) => ({ ...current, [sourceId]: "duplicate" }));
        setFeedback({ kind: "warning", message: `Duplicate found: ${checked.duplicateCheck.matchedTitle}` });
        return "duplicate";
      }
      allowDuplicateSave = window.confirm(`Duplicate found: ${checked.duplicateCheck.matchedTitle ?? checked.duplicateCheck.matchedEpId ?? "existing EP"}.\nSave anyway?`);
      if (!allowDuplicateSave) {
        replaceEp(checked, sourceId);
        setSaveState("duplicate");
        setEpSaveStates((current) => ({ ...current, [sourceId]: "duplicate" }));
        setFeedback({ kind: "warning", message: `Duplicate found: ${checked.duplicateCheck.matchedTitle}` });
        return "duplicate";
      }
      replaceEp(checked, sourceId);
    }

    const response = await fetch("/api/save-ep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...checked,
        allowDuplicateSave,
        duplicateSimilarityThresholdOverride: generationSetup.duplicateSimilarityThreshold,
        outputRootOverride: generationSetup.outputRoot
      })
    });
    const data = await response.json();
    console.log("[GF_SAVE_TRACE] save-api", { ok: response.ok, status: response.status, savedId: data.ep?.id, error: data.error });
    if (!response.ok) {
      setSaveState(data.duplicateCheck?.isDuplicate ? "duplicate" : "error");
      setEpSaveStates((current) => ({ ...current, [sourceId]: data.duplicateCheck?.isDuplicate ? "duplicate" : "error" }));
      setFeedback({ kind: "error", message: data.error ?? "Save failed" });
      return "error";
    }

    const libraryResponse = await fetch("/api/library", { cache: "no-store" });
    const libraryData = await libraryResponse.json();
    const savedExists = Boolean((libraryData.eps ?? []).some((item: GhostEp) => item.id === data.ep.id));
    console.log("[GF_SAVE_TRACE] library-refresh", { ok: libraryResponse.ok, count: libraryData.eps?.length ?? 0, savedExists });
    if (!libraryResponse.ok || !savedExists) {
      setSaveState("error");
      setEpSaveStates((current) => ({ ...current, [sourceId]: "error" }));
      setFeedback({ kind: "error", message: "Save API succeeded, but Library refresh did not return the saved EP." });
      return "error";
    }

    replaceEp(data.ep, sourceId);
    setSaveState("saved");
    setEpSaveStates((current) => {
      const next = { ...current };
      delete next[sourceId];
      next[data.ep.id] = "saved";
      return next;
    });
    setSavedLibraryId(data.ep.id);
    setModalEpId(data.ep.id);
    toast.success("Saved to Library");
    return "saved";
  }

  function savePromptVersion() {
    if (!promptText.trim()) {
      setFeedback({ kind: "warning", message: "Prompt is empty. Add prompt text before saving a version." });
      return;
    }
    const now = new Date().toISOString();
    const version = { id: `prompt-${Date.now()}`, label: `Prompt v${sessionPromptVersions.length + 1}`, prompt: promptText, createdAt: now };
    setSessionPromptVersions((current) => [version, ...current]);
    if (currentEp) {
      setBatch((current) => current ? { ...current, eps: current.eps.map((ep) => ep.id === currentEp.id ? { ...ep, promptVersions: [version, ...(ep.promptVersions ?? [])], updatedAt: now } : ep) } : current);
    }
    setFeedback({ kind: "success", message: currentEp ? `${version.label} saved to current EP draft.` : `${version.label} saved for this Generate session.` });
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#2563EB]">Generate EP</p>
          <h1 className="text-3xl font-semibold">Production Workspace</h1>
          <p className="mt-2 text-sm text-[#64748B]">Compare generated episodes, choose one, then save it to Library.</p>
        </div>
        <Link className="btn" href="/library"><Library size={16} />Library</Link>
      </div>

      <Feedback feedback={feedback} />

      <section className="space-y-5">
        <div className="studio-card space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Input / Setup</h2>
            <p className="mt-1 text-sm text-[#64748B]">Select the production brief.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-semibold">Character<select className="control mt-1" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>{characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
            <label className="text-sm font-semibold">Template<select className="control mt-1" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
            <label className="text-sm font-semibold">Goal<select className="control mt-1" value={contentGoal} onChange={(event) => setContentGoal(event.target.value as ContentGoal)}><option value="Entertainment">Entertainment</option><option value="Affiliate">Affiliate</option><option value="Educational">Educational</option><option value="Review">Review</option></select></label>
            <label className="text-sm font-semibold">Spoken Language<select className="control mt-1" value={language} onChange={(event) => setLanguage(event.target.value as SpokenLanguage)}>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
          <div className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold">EP Structure</h3>
                <p className="mt-1 text-xs text-[#64748B]">Generate multiple EP options in one batch.</p>
              </div>
              <div className="rounded-[16px] bg-white px-4 py-3 text-sm font-semibold text-[#2563EB]">
                Each EP: {videosPerEpisode} videos x {durationPerVideoSec}s = {totalEpisodeDurationSec}s total
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-semibold">EP Count<input className="control mt-1" min="1" type="number" value={generationSetup.totalEpisodes} onChange={(event) => setGenerationSetup({ ...generationSetup, totalEpisodes: Math.max(1, Number(event.target.value)) })} /></label>
              <label className="text-sm font-semibold">Videos Per EP<input className="control mt-1" min="1" type="number" value={generationSetup.videosPerEpisode} onChange={(event) => {
                const nextVideos = Math.max(1, Number(event.target.value));
                setGenerationSetup({ ...generationSetup, videosPerEpisode: nextVideos, framesPerEpisode: generationSetup.customFramesEnabled ? generationSetup.framesPerEpisode : nextVideos + 1 });
              }} /></label>
              <label className="text-sm font-semibold">Video Duration<input className="control mt-1" min="1" type="number" value={generationSetup.durationPerVideoSec} onChange={(event) => setGenerationSetup({ ...generationSetup, durationPerVideoSec: Math.max(1, Number(event.target.value)) })} /></label>
              <div className="rounded-[16px] bg-white p-3 text-sm">
                <div className="text-xs text-[#64748B]">Frames needed per EP</div>
                <div className="mt-1 text-lg font-semibold text-[#0F172A]">{framesPerEpisode}</div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-white p-3 text-sm font-semibold"><input checked={generationSetup.customFramesEnabled} onChange={(event) => setGenerationSetup({ ...generationSetup, customFramesEnabled: event.target.checked, framesPerEpisode: event.target.checked ? framesPerEpisode : automaticFramesPerEpisode })} type="checkbox" />Override frames manually</label>
              {generationSetup.customFramesEnabled ? <label className="text-sm font-semibold">Frames Per EP<input className="control mt-1" min="2" type="number" value={generationSetup.framesPerEpisode} onChange={(event) => setGenerationSetup({ ...generationSetup, framesPerEpisode: Math.max(2, Number(event.target.value)) })} /></label> : <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-3 text-sm text-[#64748B]">Auto frame logic: frames = videos + 1</div>}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-semibold">Dialogue Language<select className="control mt-1" value={language} onChange={(event) => setLanguage(event.target.value as SpokenLanguage)}>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="text-sm font-semibold">AI Mode<select className="control mt-1" value={generationSetup.aiMode} onChange={(event) => setGenerationSetup({ ...generationSetup, aiMode: event.target.value as GenerationSetup["aiMode"] })}><option value="manual">Manual AI Mode</option><option disabled value="openai_api">OpenAI API Mode (coming soon)</option><option disabled value="image_generation">Image Generation Mode (coming soon)</option></select></label>
            <label className="text-sm font-semibold">Credit Mode<select className="control mt-1" value={generationSetup.creditMode} onChange={(event) => setGenerationSetup({ ...generationSetup, creditMode: event.target.value as GenerationSetup["creditMode"] })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
            <label className="text-sm font-semibold">Similarity threshold<input className="control mt-1" max="1" min="0" step="0.01" type="number" value={generationSetup.duplicateSimilarityThreshold} onChange={(event) => setGenerationSetup({ ...generationSetup, duplicateSimilarityThreshold: Number(event.target.value) })} /></label>
            <label className="text-sm font-semibold xl:col-span-2">Output Root<input className="control mt-1" value={generationSetup.outputRoot} onChange={(event) => setGenerationSetup({ ...generationSetup, outputRoot: event.target.value })} /></label>
            <label className="flex items-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-semibold"><input checked={generationSetup.duplicateCheckEnabled} onChange={(event) => setGenerationSetup({ ...generationSetup, duplicateCheckEnabled: event.target.checked })} type="checkbox" />Duplicate Check</label>
            <label className="flex items-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-semibold"><input checked={generationSetup.saveAfterGeneration} onChange={(event) => setGenerationSetup({ ...generationSetup, saveAfterGeneration: event.target.checked })} type="checkbox" />Auto Save To Library</label>
            <label className="flex items-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-semibold"><input checked={generationSetup.framePromptsOnly} onChange={(event) => setGenerationSetup({ ...generationSetup, framePromptsOnly: event.target.checked })} type="checkbox" />Generate Frame Prompts</label>
            <label className="flex items-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-semibold text-[#94A3B8]"><input checked={generationSetup.autoImageGeneration} disabled onChange={() => undefined} type="checkbox" />Auto Image Generation (coming soon)</label>
          </div>
          {contentGoal === "Affiliate" || contentGoal === "Review" ? (
            <div className="grid gap-3">
              <input className="control" placeholder="Product Name" value={affiliateBrief.productName} onChange={(event) => setAffiliateBrief({ ...affiliateBrief, productName: event.target.value })} />
              <input className="control" placeholder="Product Problem" value={affiliateBrief.productProblem} onChange={(event) => setAffiliateBrief({ ...affiliateBrief, productProblem: event.target.value })} />
              <input className="control" placeholder="Product Benefit" value={affiliateBrief.productBenefit} onChange={(event) => setAffiliateBrief({ ...affiliateBrief, productBenefit: event.target.value })} />
              <input className="control" placeholder="CTA Text" value={affiliateBrief.ctaText} onChange={(event) => setAffiliateBrief({ ...affiliateBrief, ctaText: event.target.value })} />
            </div>
          ) : null}

          <aside className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <div className="grid grid-cols-[86px_1fr] gap-3">
              <ImagePreview className="aspect-square" label="Character" src={selectedCharacter?.imageUrl} />
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="soft-badge">{selectedCharacter?.type || "Missing"}</span>
                  <span className="soft-badge">{characterMemoryStatus}</span>
                </div>
                <h3 className="mt-2 truncate font-semibold">{selectedCharacter?.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">{selectedCharacter?.description || "No description yet."}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-[14px] bg-white p-2"><div className="text-[#64748B]">EP Count</div><div className="font-semibold">{characterEpCount}</div></div>
              <div className="rounded-[14px] bg-white p-2"><div className="text-[#64748B]">Personality</div><div className="truncate font-semibold">{selectedCharacter?.personality?.join(", ") || "None"}</div></div>
            </div>
            <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#64748B]">{selectedCharacter?.visualStyle || "No visual style."}</p>
            <div className="mt-3 grid gap-1">
              {characterMemory.map((item) => (
                <div className="flex items-center justify-between text-xs" key={item.label}>
                  <span className="text-[#64748B]">{item.label}</span>
                  <span className={`font-semibold ${item.status === "Loaded" ? "text-emerald-700" : item.status === "Missing" ? "text-red-600" : "text-[#64748B]"}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="studio-card flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Prompt Workspace</h2>
              <p className="mt-1 text-sm text-[#64748B]">Dialogue language: {language}</p>
            </div>
            <button className="btn btn-primary" onClick={() => copyWithFeedback(promptText, "Copy Prompt", setFeedback)} type="button"><Clipboard size={16} />Copy Prompt</button>
          </div>
          <textarea className="control min-h-[520px] resize-y font-mono text-xs leading-6" value={promptText} onChange={(event) => setPromptText(event.target.value)} />
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn btn-primary" onClick={generateBatch} title="Creates empty EP containers for generation workflow." type="button"><FilePlus2 size={16} />Create EP Slots</button>
            <button className="btn" onClick={savePromptVersion} type="button">Save Prompt Version</button>
            <button className="btn sm:col-span-2" onClick={() => copyWithFeedback(createFullDailyPackagePrompt(promptText, batch), "Copy full package prompt", setFeedback)} type="button">Copy With Current Slots</button>
          </div>
          <div className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Prompt Versions</h3>
              <span className="text-xs text-[#64748B]">{sessionPromptVersions.length} saved</span>
            </div>
            <div className="grid gap-2">
              {sessionPromptVersions.map((version) => (
                <div className="flex items-center justify-between gap-2 rounded-[14px] bg-white p-2" key={version.id}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{version.label}</div>
                    <div className="truncate text-xs text-[#64748B]">{new Date(version.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn h-8 px-3" onClick={() => setPromptText(version.prompt)} type="button">Restore</button>
                    <button className="btn h-8 px-3" onClick={() => copyWithFeedback(version.prompt, `Copy ${version.label}`, setFeedback)} type="button">Copy</button>
                  </div>
                </div>
              ))}
              {!sessionPromptVersions.length ? <p className="text-sm text-[#64748B]">Save a version before editing the prompt.</p> : null}
            </div>
          </div>
        </div>

        <div className="studio-card flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Result / EP Output</h2>
              <p className="mt-1 text-sm text-[#64748B]">Compare parsed EP cards, use one, then save it.</p>
            </div>
            <button className="btn btn-primary" disabled={checking} onClick={parseResult} type="button">{checking ? "Parsing..." : "Parse Result"}</button>
          </div>
          <details className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#0F172A]">Developer / Raw Output</summary>
            <textarea className="control mt-3 min-h-36 resize-none" value={rawResult} onChange={(event) => setRawResult(event.target.value)} placeholder="Paste AI Result here..." />
          </details>

          {batch?.eps.length ? (
            <div className="space-y-3">
              {batch.eps.map((ep, index) => {
                const active = currentEp?.id === ep.id;
                const rowState = epSaveStates[ep.id] ?? (ep.duplicateCheck.isDuplicate ? "duplicate" : "unsaved");
                const durationLabel = ep.durationSec ? `${ep.durationSec}s` : ep.format;
                return (
                  <article
                    className={`w-full rounded-[20px] border p-4 text-left transition ${active ? "border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#BFDBFE]" : "border-[#E2E8F0] bg-white hover:border-[#BFDBFE]"}`}
                    key={ep.id}
                    onClick={() => selectEp(ep)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#2563EB]">{ep.id || `EP${String(index + 1).padStart(2, "0")}`}</span>
                      <span className="text-xs font-semibold text-[#64748B]">|</span>
                      <span className="text-xs font-semibold text-[#64748B]">{durationLabel}</span>
                      <span className="text-xs font-semibold text-[#64748B]">|</span>
                      <span className="text-xs font-semibold text-[#64748B]">{ep.videos.length}V / {ep.frames.length}F</span>
                      <span className="text-xs font-semibold text-[#64748B]">|</span>
                      <span className="text-xs font-semibold text-[#64748B]">{ep.category || "Uncategorized"}</span>
                      {rowState !== "unsaved" ? <span className="soft-badge">{rowState}</span> : null}
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold text-[#0F172A]">{ep.title || ep.id}</h3>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-[#64748B]">Created: {ep.date}</p>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn h-9 px-3" onClick={() => { selectEp(ep); setModalEpId(ep.id); }} type="button">View Details</button>
                        <button className="btn btn-primary h-9 px-3" disabled={rowState === "saving"} onClick={(event) => { event.stopPropagation(); selectEp(ep); void saveToLibrary(ep); }} type="button">{rowState === "saved" ? "Save Again" : rowState === "duplicate" ? "Save Anyway" : rowState === "saving" ? "Saving..." : "Save"}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-[18px] border border-dashed border-[#CBD5E1] bg-white p-6 text-center text-sm text-[#64748B]">
              Paste AI result in Developer / Raw Output, then click Parse Result to preview your EP list.
            </div>
          )}
        </div>
      </section>
      {modalEp ? (
        <EpResultModal
          ep={modalEp}
          epNumber={`EP${String((batch?.eps.findIndex((ep) => ep.id === modalEp.id) ?? 0) + 1).padStart(2, "0")}`}
          saveState={epSaveStates[modalEp.id] ?? (modalEp.duplicateCheck.isDuplicate ? "duplicate" : "unsaved")}
          onClose={() => setModalEpId(null)}
          onSave={saveToLibrary}
          onCopy={(text, label) => copyWithFeedback(text, label, setFeedback)}
        />
      ) : null}
    </div>
  );
}
