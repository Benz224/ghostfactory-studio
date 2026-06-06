import { Blocks, CalendarDays, CheckCircle2, Clock3, FilePlus2, Image, Library, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { getCharacters, getEpHistory, getTemplates } from "@/lib/storage";
import type { GhostEp } from "@/lib/types";

function progress(ep: GhostEp) {
  const values = Object.values(ep.checklist ?? {}) as boolean[];
  return values.length ? Math.round((values.filter(Boolean).length / values.length) * 100) : 0;
}

export default async function HomePage() {
  const [history, characters, templates] = await Promise.all([getEpHistory(), getCharacters(), getTemplates()]);
  const today = new Date().toISOString().slice(0, 10);
  const posted = history.filter((ep) => ep.status === "posted" || ep.checklist?.postedDone).length;
  const ready = history.filter((ep) => ep.status === "video_ready" || ep.checklist?.editedDone).length;
  const drafts = history.filter((ep) => ep.status === "idea" || ep.status === "prompt_ready").length;
  const assets = characters.filter((item) => item.imageUrl).length + history.filter((ep) => ep.thumbnailImage).length + history.reduce((sum, ep) => sum + Object.keys(ep.frameImages ?? {}).length, 0);
  const languageCounts = history.reduce<Record<string, number>>((acc, ep) => ({ ...acc, [ep.language || "Thai"]: (acc[ep.language || "Thai"] ?? 0) + 1 }), {});

  const summary = [
    { label: "Total EP", value: history.length, icon: Sparkles },
    { label: "Created Today", value: history.filter((ep) => ep.date === today).length, icon: Clock3 },
    { label: "Ready To Post", value: ready, icon: CheckCircle2 },
    { label: "Posted", value: posted, icon: CalendarDays },
    { label: "Draft", value: drafts, icon: FilePlus2 },
    { label: "Characters", value: characters.length, icon: UserRound },
    { label: "Templates", value: templates.length, icon: Blocks },
    { label: "Assets", value: assets, icon: Image }
  ];

  const activity = [
    ...history.slice(0, 3).map((ep) => ({ action: "Saved EP", text: ep.title || ep.id, date: ep.updatedAt || ep.createdAt })),
    ...history.filter((ep) => ep.thumbnailImage).slice(0, 2).map((ep) => ({ action: "Added Thumbnail", text: ep.title || ep.id, date: ep.updatedAt || ep.createdAt })),
    ...characters.slice(0, 2).map((character) => ({ action: "Updated Character", text: character.name, date: character.updatedAt || character.createdAt || "" }))
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col justify-between gap-5 rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#2563EB]">Studio Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0F172A] md:text-4xl">Manual AI content workflow</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">A clean overview for characters, templates, prompts, EP output, thumbnails, and library progress.</p>
        </div>
        <Link className="btn btn-primary" href="/generator"><FilePlus2 size={18} />Generate EP</Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <div className="studio-card" key={item.label}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#64748B]">{item.label}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#EFF6FF] text-[#2563EB]"><Icon size={18} /></span>
              </div>
              <div className="mt-5 text-3xl font-semibold">{item.value}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="studio-card">
          <h2 className="text-lg font-semibold">Workflow Overview</h2>
          <div className="mt-4 grid gap-2">
            {["Character", "Template", "Generate Prompt", "AI Result", "Parse", "Save EP", "Library"].map((step, index) => (
              <div className="flex items-center gap-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3" key={step}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-sm font-semibold text-[#2563EB]">{index + 1}</span>
                <span className="text-sm font-semibold">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="studio-card">
          <h2 className="text-lg font-semibold">Multi Language Center</h2>
          <div className="mt-4 grid gap-2">
            {["Thai", "English", "Japanese", "Korean", "Chinese", "No Dialogue"].map((language) => (
              <div className="flex items-center justify-between rounded-[16px] bg-[#F8FAFC] p-3 text-sm" key={language}>
                <span className="font-semibold">{language}</span>
                <span className="soft-badge">{languageCounts[language] ?? 0} EP</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="studio-card">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <div className="mt-4 grid gap-2">
            {activity.map((item, index) => (
              <div className="rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3" key={`${item.action}-${index}`}>
                <div className="text-sm font-semibold">{item.action}</div>
                <div className="mt-1 truncate text-xs text-[#64748B]">{item.text}</div>
              </div>
            ))}
            {!activity.length ? <div className="text-sm text-[#64748B]">No activity yet.</div> : null}
          </div>
        </div>
        <div className="studio-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Recent EP</h2>
              <p className="text-sm text-[#64748B]">Latest saved content packages</p>
            </div>
            <Link className="btn" href="/library"><Library size={16} />Open Library</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {history.slice(0, 6).map((ep) => (
              <article className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-3" key={ep.id}>
                <div className="soft-badge w-fit">{ep.language}</div>
                <h3 className="mt-3 line-clamp-2 font-semibold">{ep.title || ep.id}</h3>
                <div className="mt-3 h-2 rounded-full bg-[#E2E8F0]"><div className="h-2 rounded-full bg-[#2563EB]" style={{ width: `${progress(ep)}%` }} /></div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
