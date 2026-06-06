"use client";

import { Blocks, Clipboard, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { copyWithFeedback, type ActionFeedback } from "@/lib/clipboard";
import { buildTemplateInstructions } from "@/lib/prompt-template";
import type { GhostTemplate, SpokenLanguage } from "@/lib/types";

const languages: SpokenLanguage[] = ["Thai", "English", "Japanese", "Korean", "Chinese", "No Dialogue"];

function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join("\n");
}

function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, "-").replace(/^-|-$/g, "") || `template-${Date.now()}`;
}

export function TemplateManager({ initialTemplates }: { initialTemplates: GhostTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeId, setActiveId] = useState(initialTemplates[0]?.id ?? "");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const active = templates.find((template) => template.id === activeId) ?? templates[0];

  function update(next: GhostTemplate) {
    setTemplates((current) => current.map((template) => (template.id === active.id ? next : template)));
    setActiveId(next.id);
  }

  async function save(next = templates) {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    const data = await response.json();
    setTemplates(data.templates ?? next);
    setFeedback({ kind: response.ok ? "success" : "error", message: response.ok ? "Saved templates.json" : data.error ?? "Save failed" });
  }

  function addTemplate() {
    const next: GhostTemplate = {
      id: `template-${Date.now()}`,
      name: "New Template",
      category: "Comedy",
      goal: "",
      structure: ["hook", "action", "twist"],
      bestFor: ["creator"],
      defaultFrameCount: 3,
      defaultVideoCount: 2,
      tone: "simple, useful, clean",
      languageSupport: [...languages],
      isDefault: false
    };
    setTemplates((current) => [next, ...current]);
    setActiveId(next.id);
  }

  function removeTemplate(id: string) {
    const next = templates.filter((template) => template.id !== id);
    setTemplates(next);
    setActiveId(next[0]?.id ?? "");
    void save(next);
  }

  function setDefault(id: string) {
    const next = templates.map((template) => ({ ...template, isDefault: template.id === id }));
    setTemplates(next);
    void save(next);
  }

  if (!active) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={addTemplate} type="button"><Plus size={16} />New Template</button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {templates.map((template) => (
          <button className={`studio-card text-left ${template.id === active.id ? "ring-2 ring-[#2563EB]" : ""}`} key={template.id} onClick={() => setActiveId(template.id)} type="button">
            <div className="thumb">
              <Blocks size={42} className="text-[#2563EB]" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="soft-badge">{template.category}</span>
              {template.isDefault ? <span className="soft-badge">Default</span> : null}
            </div>
            <h2 className="mt-3 text-lg font-semibold">{template.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64748B]">{template.goal || template.tone}</p>
            <div className="mt-4 text-sm font-semibold">{template.defaultFrameCount} frames / {template.defaultVideoCount} videos</div>
          </button>
        ))}
      </section>

      <section className="studio-card space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold">Edit Template</h2>
            <p className="text-sm text-[#64748B]">Tune structure, tone, and language support.</p>
          </div>
          {feedback ? <div className="rounded-[16px] bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#2563EB]">{feedback.message}</div> : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold">Name<input className="control mt-1" value={active.name} onChange={(event) => update({ ...active, name: event.target.value, id: active.id || slug(event.target.value) })} /></label>
          <label className="text-sm font-semibold">ID<input className="control mt-1" value={active.id} onChange={(event) => update({ ...active, id: slug(event.target.value) })} /></label>
          <label className="text-sm font-semibold">Category<input className="control mt-1" value={active.category} onChange={(event) => update({ ...active, category: event.target.value })} /></label>
          <label className="text-sm font-semibold">Tone<input className="control mt-1" value={active.tone} onChange={(event) => update({ ...active, tone: event.target.value })} /></label>
          <label className="text-sm font-semibold">Frame Count<input className="control mt-1" type="number" value={active.defaultFrameCount} onChange={(event) => update({ ...active, defaultFrameCount: Number(event.target.value) })} /></label>
          <label className="text-sm font-semibold">Video Count<input className="control mt-1" type="number" value={active.defaultVideoCount} onChange={(event) => update({ ...active, defaultVideoCount: Number(event.target.value) })} /></label>
        </div>
        <label className="block text-sm font-semibold">Goal<textarea className="control mt-1 min-h-24" value={active.goal} onChange={(event) => update({ ...active, goal: event.target.value })} /></label>
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block text-sm font-semibold">Structure<textarea className="control mt-1 min-h-28" value={joinLines(active.structure)} onChange={(event) => update({ ...active, structure: splitLines(event.target.value) })} /></label>
          <label className="block text-sm font-semibold">Best For<textarea className="control mt-1 min-h-28" value={joinLines(active.bestFor)} onChange={(event) => update({ ...active, bestFor: splitLines(event.target.value) })} /></label>
          <label className="block text-sm font-semibold">Language Support<select className="control mt-1" value={(active.languageSupport ?? languages)[0]} onChange={(event) => update({ ...active, languageSupport: [event.target.value as SpokenLanguage] })}>{languages.map((language) => <option key={language} value={language}>{language}</option>)}</select><p className="mt-2 text-xs text-[#64748B]">Use all languages by default, or choose a primary supported language.</p></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => save()} type="button"><Save size={16} />Save</button>
          <button className="btn" onClick={() => setDefault(active.id)} type="button">Set Default</button>
          <button className="btn" onClick={() => copyWithFeedback(buildTemplateInstructions(active), "Copy Template Prompt", setFeedback)} type="button"><Clipboard size={16} />Copy Prompt</button>
          <button className="btn" onClick={() => removeTemplate(active.id)} type="button"><Trash2 size={16} />Delete</button>
        </div>
      </section>
    </div>
  );
}
