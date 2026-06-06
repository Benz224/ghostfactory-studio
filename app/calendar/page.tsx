"use client";

import { useEffect, useMemo, useState } from "react";
import type { GhostEp } from "@/lib/types";

export default function CalendarPage() {
  const [eps, setEps] = useState<GhostEp[]>([]);

  async function load() {
    const response = await fetch("/api/library");
    const data = await response.json();
    setEps(data.eps ?? []);
  }

  async function update(epId: string, patch: Partial<GhostEp>) {
    setEps((current) => current.map((ep) => ep.id === epId ? { ...ep, ...patch } : ep));
    await fetch("/api/update-ep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ epId, patch }) });
  }

  useEffect(() => {
    load();
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, GhostEp[]>();
    eps.forEach((ep) => {
      const key = ep.plannedPostDate || ep.postedDate || ep.date;
      map.set(key, [...(map.get(key) ?? []), ep]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [eps]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#2563EB]">Content Calendar</p>
        <h1 className="text-3xl font-semibold">Posting Plan</h1>
        <p className="mt-2 text-sm text-[#64748B]">Track created, planned post, and posted dates manually.</p>
      </div>
      <section className="grid gap-4">
        {byDate.map(([date, items]) => (
          <div className="studio-card" key={date}>
            <h2 className="text-lg font-semibold">{date}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((ep) => (
                <article className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-4" key={ep.id}>
                  <div className="soft-badge w-fit">{ep.status}</div>
                  <h3 className="mt-3 line-clamp-2 font-semibold">{ep.title || ep.id}</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold">Planned<input className="control mt-1" type="date" value={ep.plannedPostDate ?? ""} onChange={(event) => update(ep.id, { plannedPostDate: event.target.value })} /></label>
                    <label className="text-xs font-semibold">Posted<input className="control mt-1" type="date" value={ep.postedDate ?? ""} onChange={(event) => update(ep.id, { postedDate: event.target.value })} /></label>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
