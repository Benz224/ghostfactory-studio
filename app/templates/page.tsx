import { TemplateManager } from "@/components/TemplateManager";
import { getTemplates } from "@/lib/storage";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-[#2563EB]">Templates</p>
        <h1 className="text-3xl font-semibold">Content Templates</h1>
        <p className="mt-2 text-sm text-[#64748B]">Manage reusable flows for Comedy, Affiliate, Educational, Story, and review content.</p>
      </div>
      <TemplateManager initialTemplates={templates} />
    </div>
  );
}
