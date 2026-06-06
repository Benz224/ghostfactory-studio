import { SettingsForm } from "@/components/SettingsForm";
import { getSettings } from "@/lib/storage";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-[#2563EB]">Settings</p>
        <h1 className="text-3xl font-semibold">Studio Settings</h1>
        <p className="mt-2 text-sm text-[#64748B]">Configure system defaults. Production controls now live in Generator Input / Setup.</p>
      </div>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
