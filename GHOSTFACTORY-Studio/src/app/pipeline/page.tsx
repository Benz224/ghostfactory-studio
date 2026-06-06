"use client";

import { useEffect, useState } from "react";
import type { EpStatus, GhostEp } from "@/lib/types";

const columns: { title: string; status: EpStatus }[] = [
  { title: "Ideas", status: "idea" },
  { title: "Draft", status: "prompt_ready" },
  { title: "Generating", status: "frame_ready" },
  { title: "Ready", status: "video_ready" },
  { title: "Posted", status: "posted" },
  { title: "Archived", status: "archived" }
];

export default function PipelinePage() {
  const [eps, setEps] = useState<GhostEp[]>([]);

  async function load() {
    const response = await fetch("/api/library");
    const data = await response.json();
    setEps(data.eps ?? []);
  }

  async function move(epId: string, status: EpStatus) {
    setEps((current) => current.map((ep) => ep.id === epId ? { ...ep, status } : ep));
    await fetch("/api/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ epId, status }) });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#2563EB]">Pipeline Board</p>
        <h1 className="text-3xl font-semibold">Content Kanban</h1>
        <p className="mt-2 text-sm text-[#64748B]">Move EP status through the production pipeline.</p>
      </div>
      <section className="grid gap-4 xl:grid-cols-6">
        {columns.map((column) => (
          <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-4" key={column.status}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{column.title}</h2>
              <span className="soft-badge">{eps.filter((ep) => ep.status === column.status).length}</span>
            </div>
            <div className="grid gap-3">
              {eps.filter((ep) => ep.status === column.status).map((ep) => (
                <article className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-3" key={ep.id}>
                  <div className="text-xs font-semibold text-[#2563EB]">{ep.id}</div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-semibold">{ep.title || ep.category}</h3>
                  <select className="control mt-3 h-10" value={ep.status} onChange={(event) => move(ep.id, event.target.value as EpStatus)}>
                    {columns.map((item) => <option key={item.status} value={item.status}>{item.title}</option>)}
                  </select>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
