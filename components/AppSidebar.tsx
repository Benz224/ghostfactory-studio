"use client";

import { Blocks, Bot, Clapperboard, LayoutDashboard, Library, Settings, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generator", label: "Generate", icon: Sparkles },
  { href: "/library", label: "Library", icon: Library },
  { href: "/characters", label: "Characters", icon: UserRound },
  { href: "/templates", label: "Templates", icon: Blocks },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/90 px-4 py-3 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="flex items-center gap-3 lg:mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#0F172A] text-white shadow-sm">
          <Bot size={21} />
        </div>
        <div className="min-w-0">
          <Link className="block truncate text-base font-semibold text-[#0F172A]" href="/">
            GhostFactory
          </Link>
          <div className="truncate text-xs font-medium text-[#64748B]">AI Creator Studio</div>
        </div>
      </div>

      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:mt-0 lg:flex-col lg:overflow-visible lg:pb-0">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              className={`inline-flex h-11 shrink-0 items-center gap-3 rounded-[16px] px-4 text-sm font-semibold transition ${
                active
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 hidden rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 lg:block">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
          <Clapperboard size={16} className="text-[#2563EB]" />
          Shorts Workflow
        </div>
        <p className="mt-2 text-sm leading-6 text-[#64748B]">Setup, prompt, parse, save, and post from one clean production space.</p>
      </div>
    </aside>
  );
}
