import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/storage";
import type { Settings } from "@/lib/types";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const settings = (await request.json()) as Settings;
  const saved = await saveSettings({
    ...settings,
    creditMode: settings.creditMode ?? "normal",
    aiMode: "manual",
    daily24sCount: Number(settings.daily24sCount),
    daily16sCount: Number(settings.daily16sCount),
    duplicateSimilarityThreshold: Number(settings.duplicateSimilarityThreshold)
  });
  return NextResponse.json(saved);
}
