"use client";

import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Idea } from "@/lib/types";

function blankIdea(): Idea {
  const now = new Date().toISOString();
  return { id: `idea-${Date.now()}`, title: "New Idea", category: "Comedy", tags: [], note: "", usedCount: 0, createdAt: now, updatedAt: now };
}

export default function IdeaBankPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);

  async function load() {
    const response = await fetch("/api/ideas");
    const data = await response.json();
    setIdeas(data.ideas ?? []);
  }

  async function save(next = ideas) {
    const response = await fetch("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    const data = await response.json();
    setIdeas(data.ideas ?? next);
  }

  async function useIdea(id: string) {
    await fetch("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ useIdeaId: id }) });
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#2563EB]">Idea Bank</p>
          <h1 className="text-3xl font-semibold">Trending Ideas</h1>
          <p className="mt-2 text-sm text-[#64748B]">Store reusable content ideas and send them into the Generate workflow.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIdeas((current) => [blankIdea(), ...current])} type="button"><Plus size={16} />New Idea</button>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ideas.map((idea, index) => (
          <article className="studio-card" key={idea.id}>
            <input className="w-full bg-transparent text-lg font-semibold outline-none" value={idea.title} onChange={(event) => { const next = [...ideas]; next[index] = { ...idea, title: event.target.value, updatedAt: new Date().toISOString() }; setIdeas(next); }} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input className="control" value={idea.category} onChange={(event) => { const next = [...ideas]; next[index] = { ...idea, category: event.target.value, updatedAt: new Date().toISOString() }; setIdeas(next); }} />
              <input className="control" value={idea.tags.join(", ")} onChange={(event) => { const next = [...ideas]; next[index] = { ...idea, tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean), updatedAt: new Date().toISOString() }; setIdeas(next); }} />
            </div>
            <textarea className="control mt-3 min-h-24" value={idea.note} onChange={(event) => { const next = [...ideas]; next[index] = { ...idea, note: event.target.value, updatedAt: new Date().toISOString() }; setIdeas(next); }} placeholder="Note" />
            <div className="mt-4 flex items-center justify-between">
              <span className="soft-badge">Used {idea.usedCount}</span>
              <div className="flex gap-2">
                <button className="btn" onClick={() => save()} type="button">Save</button>
                <Link className="btn btn-primary" href="/generator" onClick={() => useIdea(idea.id)}><Sparkles size={16} />Use Idea</Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
