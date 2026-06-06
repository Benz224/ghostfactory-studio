"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { devButtonLog, type ActionFeedback } from "@/lib/clipboard";
import type { Settings } from "@/lib/types";

export function SettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  async function save() {
    devButtonLog("Save Settings", {
      creditMode: settings.creditMode,
      defaultLanguage: settings.defaultLanguage,
      outputRoot: settings.outputRoot,
      threshold: settings.duplicateSimilarityThreshold
    });
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      devButtonLog("Save Settings API", { status: response.status });
      const saved = await response.json();
      if (!response.ok) {
        setFeedback({ kind: "error", message: saved.error ?? "Save Settings ไม่สำเร็จ" });
        return;
      }
      setSettings(saved);
      setFeedback({ kind: "success", message: "บันทึก settings.json แล้ว" });
    } catch (error) {
      setFeedback({ kind: "error", message: `Save Settings ไม่สำเร็จ: ${(error as Error).message}` });
    }
  }

  return (
    <div className="studio-card max-w-4xl space-y-4">
      {feedback ? (
        <div className={`rounded-[18px] border p-3 text-sm font-semibold ${feedback.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {feedback.message}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Default Credit Mode
          <select
            className="control mt-1"
            value={settings.creditMode}
            onChange={(event) => setSettings({ ...settings, creditMode: event.target.value as Settings["creditMode"] })}
          >
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Default Language
          <select
            className="control mt-1"
            value={settings.defaultLanguage}
            onChange={(event) => setSettings({ ...settings, defaultLanguage: event.target.value as Settings["defaultLanguage"] })}
          >
            <option value="thai">thai</option>
            <option value="english">english</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Output Root
          <input
            className="control mt-1"
            value={settings.outputRoot}
            onChange={(event) => setSettings({ ...settings, outputRoot: event.target.value })}
          />
        </label>
        <label className="text-sm font-semibold">
          Duplicate Similarity Threshold
          <input
            className="control mt-1"
            max="1"
            min="0"
            step="0.01"
            type="number"
            value={settings.duplicateSimilarityThreshold}
            onChange={(event) => setSettings({ ...settings, duplicateSimilarityThreshold: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#64748B]">
        Daily counts, AI mode, and image generation are controlled per generation in the Generator Input / Setup panel.
      </div>
      <button className="btn btn-primary" onClick={save} type="button">
        <Save size={16} />
        Save Settings
      </button>
    </div>
  );
}
