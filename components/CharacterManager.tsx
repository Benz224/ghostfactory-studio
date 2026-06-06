"use client";

import { Clipboard, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { ImagePicker, ImagePreview } from "@/components/ImagePicker";
import { copyWithFeedback, type ActionFeedback } from "@/lib/clipboard";
import { buildCharacterLock } from "@/lib/prompt-template";
import type { GhostCharacter } from "@/lib/types";

const voicePresets = ["Thai Boy", "Thai Adult", "English Kid", "No Dialogue"];
const languageOptions = ["Thai", "English", "Japanese", "Korean", "Chinese", "No Dialogue"] as const;

function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join("\n");
}

function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "") || `character-${Date.now()}`;
}

export function CharacterManager({ initialCharacters, epCounts = {} }: { initialCharacters: GhostCharacter[]; epCounts?: Record<string, number> }) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [activeId, setActiveId] = useState(initialCharacters[0]?.id ?? "");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const active = characters.find((character) => character.id === activeId) ?? characters[0];

  function update(next: GhostCharacter) {
    setCharacters((current) => current.map((character) => (character.id === active.id ? next : character)));
    setActiveId(next.id);
  }

  async function save(next = characters) {
    const response = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    const data = await response.json();
    setCharacters(data.characters ?? next);
    setFeedback({ kind: response.ok ? "success" : "error", message: response.ok ? "Saved characters.json" : data.error ?? "Save failed" });
  }

  function addCharacter() {
    const next: GhostCharacter = {
      id: `character-${Date.now()}`,
      name: "New Character",
      type: "mascot",
      description: "",
      visualStyle: "Pixar-quality 3D animation, cinematic lighting, commercial quality visuals",
      personality: [],
      rules: [],
      negativeRules: ["no subtitles", "no caption overlay", "no text overlay", "no watermark", "no logo"],
      imageUrl: "",
      referenceImages: [],
      voicePreset: "Thai Boy",
      defaultLanguage: "Thai",
      languagePreference: "Thai",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false
    };
    setCharacters((current) => [next, ...current]);
    setActiveId(next.id);
  }

  function removeCharacter(id: string) {
    const next = characters.filter((character) => character.id !== id);
    setCharacters(next);
    setActiveId(next[0]?.id ?? "");
    void save(next);
  }

  function setDefault(id: string) {
    const next = characters.map((character) => ({ ...character, isDefault: character.id === id }));
    setCharacters(next);
    void save(next);
  }

  if (!active) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={addCharacter} type="button"><Plus size={16} />New Character</button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {characters.map((character) => (
          <button className={`studio-card text-left ${character.id === active.id ? "ring-2 ring-[#2563EB]" : ""}`} key={character.id} onClick={() => setActiveId(character.id)} type="button">
            <ImagePreview label="Character" src={character.imageUrl} />
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="soft-badge">{character.type}</span>
              {character.isDefault ? <span className="soft-badge">Default</span> : null}
            </div>
            <h2 className="mt-3 text-lg font-semibold">{character.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64748B]">{character.description || character.visualStyle}</p>
            <div className="mt-4 text-sm font-semibold text-[#0F172A]">{epCounts[character.id] ?? 0} EP</div>
          </button>
        ))}
      </section>

      <section className="studio-card space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold">Edit Character</h2>
            <p className="text-sm text-[#64748B]">Keep identity, visual style, rules, and negative rules clean.</p>
          </div>
          {feedback ? <div className="rounded-[16px] bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#2563EB]">{feedback.message}</div> : null}
        </div>
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <ImagePicker
            label="Character Avatar"
            note="Use a square 1:1 character reference. JPG, PNG, WebP up to 5MB."
            value={active.imageUrl}
            onChange={(imageUrl) => update({ ...active, imageUrl, updatedAt: new Date().toISOString() })}
            onError={(message) => setFeedback({ kind: "error", message })}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold">Name<input className="control mt-1" value={active.name} onChange={(event) => update({ ...active, name: event.target.value, id: active.id || slug(event.target.value), updatedAt: new Date().toISOString() })} /></label>
            <label className="text-sm font-semibold">ID<input className="control mt-1" value={active.id} onChange={(event) => update({ ...active, id: slug(event.target.value), updatedAt: new Date().toISOString() })} /></label>
            <label className="text-sm font-semibold">Type<input className="control mt-1" value={active.type} onChange={(event) => update({ ...active, type: event.target.value, updatedAt: new Date().toISOString() })} /></label>
            <label className="text-sm font-semibold">Visual Style<input className="control mt-1" value={active.visualStyle} onChange={(event) => update({ ...active, visualStyle: event.target.value, updatedAt: new Date().toISOString() })} /></label>
            <label className="text-sm font-semibold">Voice Preset<select className="control mt-1" value={active.voicePreset ?? "Thai Boy"} onChange={(event) => update({ ...active, voicePreset: event.target.value, updatedAt: new Date().toISOString() })}>{voicePresets.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="text-sm font-semibold">Default Spoken Language<select className="control mt-1" value={active.defaultLanguage ?? active.languagePreference ?? "Thai"} onChange={(event) => update({ ...active, defaultLanguage: event.target.value as GhostCharacter["defaultLanguage"], languagePreference: event.target.value as GhostCharacter["languagePreference"], updatedAt: new Date().toISOString() })}>{languageOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
        </div>
        <label className="block text-sm font-semibold">Description<textarea className="control mt-1 min-h-24" value={active.description} onChange={(event) => update({ ...active, description: event.target.value, updatedAt: new Date().toISOString() })} /></label>
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block text-sm font-semibold">Personality<textarea className="control mt-1 min-h-28" value={joinLines(active.personality)} onChange={(event) => update({ ...active, personality: splitLines(event.target.value), updatedAt: new Date().toISOString() })} /></label>
          <label className="block text-sm font-semibold">Rules<textarea className="control mt-1 min-h-28" value={joinLines(active.rules)} onChange={(event) => update({ ...active, rules: splitLines(event.target.value), updatedAt: new Date().toISOString() })} /></label>
          <label className="block text-sm font-semibold">Negative Rules<textarea className="control mt-1 min-h-28" value={joinLines(active.negativeRules)} onChange={(event) => update({ ...active, negativeRules: splitLines(event.target.value), updatedAt: new Date().toISOString() })} /></label>
        </div>
        <section className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="mb-3">
            <h3 className="font-semibold">Character Asset Manager</h3>
            <p className="text-sm text-[#64748B]">Main image, reference images, voice preset, visual rules, and negative rules.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(active.referenceImages ?? []).map((image, index) => (
              <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-3" key={`${image.slice(0, 24)}-${index}`}>
                <ImagePreview label={`Reference ${index + 1}`} src={image} />
                <button className="btn mt-3 w-full" onClick={() => update({ ...active, referenceImages: (active.referenceImages ?? []).filter((_, itemIndex) => itemIndex !== index), updatedAt: new Date().toISOString() })} type="button">Remove</button>
              </div>
            ))}
            <ImagePicker
              label="Reference Image"
              note="Upload reference images for future visual consistency."
              value=""
              onChange={(image) => update({ ...active, referenceImages: [...(active.referenceImages ?? []), image], updatedAt: new Date().toISOString() })}
              onError={(message) => setFeedback({ kind: "error", message })}
            />
          </div>
        </section>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => save()} type="button"><Save size={16} />Save</button>
          <button className="btn" onClick={() => setDefault(active.id)} type="button">Set Default</button>
          <button className="btn" onClick={() => copyWithFeedback(buildCharacterLock(active), "Copy Character Lock Prompt", setFeedback)} type="button"><Clipboard size={16} />Copy Lock</button>
          <button className="btn" onClick={() => removeCharacter(active.id)} type="button"><Trash2 size={16} />Delete</button>
        </div>
      </section>
    </div>
  );
}
