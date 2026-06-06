import { DailyBatchView } from "@/components/DailyBatchView";
import { appendHistoryToPrompt, buildGeneratorPrompt } from "@/lib/prompt-template";
import { getCharacters, getDefaultCharacter, getDefaultTemplate, getEpHistory, getIdeaMemory, getSettings, getTemplates } from "@/lib/storage";

export default async function GeneratorPage() {
  const [characters, templates, character, template, history, ideaMemory, settings] = await Promise.all([
    getCharacters(),
    getTemplates(),
    getDefaultCharacter(),
    getDefaultTemplate(),
    getEpHistory(),
    getIdeaMemory(),
    getSettings()
  ]);
  const jsonPrompt = buildGeneratorPrompt({ character, template, contentGoal: "Entertainment", settings, language: "Thai" });
  const historyPrompt = appendHistoryToPrompt(jsonPrompt, history, 50, ideaMemory);

  return (
    <DailyBatchView
      characters={characters}
      templates={templates}
      defaultCharacterId={character.id}
      defaultTemplateId={template.id}
      settings={settings}
      basePrompt={jsonPrompt}
      jsonPrompt={jsonPrompt}
      historyPrompt={historyPrompt}
      history={history}
      ideaMemory={ideaMemory}
    />
  );
}
