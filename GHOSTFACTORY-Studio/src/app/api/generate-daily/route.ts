import { NextResponse } from "next/server";
import { generateDailyBatch } from "@/lib/ep-generator";
import { getCharacter, getCharacterById, getDefaultCharacter, getDefaultTemplate, getIdeaMemory, getSettings, getTemplateById, saveDailyBatch } from "@/lib/storage";
import type { ContentGoal, GenerationSetup, Settings, SpokenLanguage } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const [character, ideaMemory, settings] = await Promise.all([getCharacter(), getIdeaMemory(), getSettings()]);
  const selectedCharacter = body.characterId ? await getCharacterById(body.characterId) : await getDefaultCharacter();
  const selectedTemplate = body.templateId ? await getTemplateById(body.templateId) : await getDefaultTemplate();
  const contentGoal = (body.contentGoal || "Entertainment") as ContentGoal;
  const language = (body.language || "Thai") as SpokenLanguage;
  const generationSetup = body.generationSetup as GenerationSetup | undefined;
  const effectiveSettings: Settings = generationSetup
    ? {
        ...settings,
        aiMode: "manual",
        autoImageGeneration: generationSetup.autoImageGeneration,
        creditMode: generationSetup.creditMode === "medium" ? "normal" : generationSetup.creditMode,
        daily16sCount: 0,
        daily24sCount: generationSetup.totalEpisodes,
        duplicateSimilarityThreshold: generationSetup.duplicateSimilarityThreshold,
        outputRoot: generationSetup.outputRoot || settings.outputRoot
      }
    : settings;
  const batch = generateDailyBatch(undefined, character, ideaMemory, effectiveSettings, {
    character: selectedCharacter ?? undefined,
    template: selectedTemplate ?? undefined,
    contentGoal,
    language,
    generationSetup
  });
  await saveDailyBatch(batch.date, batch);
  return NextResponse.json(batch);
}
