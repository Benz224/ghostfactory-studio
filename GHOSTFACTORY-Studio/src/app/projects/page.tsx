"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/types";

function blankProject(): Project {
  const now = new Date().toISOString();
  return { id: `project-${Date.now()}`, name: "New Project", description: "", settings: {}, createdAt: now, updatedAt: now };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  async function load() {
    const response = await fetch("/api/projects");
    const data = await response.json();
    setProjects(data.projects ?? []);
  }

  async function save(next = projects) {
    const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    const data = await response.json();
    setProjects(data.projects ?? next);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#2563EB]">Projects</p>
          <h1 className="text-3xl font-semibold">Project System</h1>
          <p className="mt-2 text-sm text-[#64748B]">Default Project keeps legacy data compatible while new channels can be prepared.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setProjects((current) => [blankProject(), ...current])} type="button"><Plus size={16} />New Project</button>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project, index) => (
          <article className="studio-card" key={project.id}>
            <input className="w-full bg-transparent text-lg font-semibold outline-none" value={project.name} onChange={(event) => { const next = [...projects]; next[index] = { ...project, name: event.target.value, updatedAt: new Date().toISOString() }; setProjects(next); }} />
            <textarea className="control mt-3 min-h-24" value={project.description} onChange={(event) => { const next = [...projects]; next[index] = { ...project, description: event.target.value, updatedAt: new Date().toISOString() }; setProjects(next); }} placeholder="Description" />
            <div className="mt-4 flex items-center justify-between">
              <span className="soft-badge">{project.id}</span>
              <button className="btn btn-primary" onClick={() => save()} type="button">Save</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
