import type { DuplicateResult, GhostEp } from "./types";
import { getEpHistory, getEpisodeMemory, getSettings } from "./storage";

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseTokens(input: string) {
  const normalized = normalizeText(input);
  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function phraseNgrams(text: string, size: number) {
  const compact = phraseTokens(text).join(" ");
  const parts = new Set<string>();
  const tokens = compact.split(/\s+/).filter(Boolean);
  if (tokens.length <= size) {
    if (compact) parts.add(compact);
    return parts;
  }
  for (let i = 0; i <= tokens.length - size; i += 1) {
    parts.add(tokens.slice(i, i + size).join(" "));
  }
  return parts;
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size && !b.size) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

type DuplicateComparableEp = Pick<GhostEp, "title" | "story" | "hook" | "category"> & Partial<Pick<GhostEp, "coreIdea" | "episodeState" | "storyArchetype">>;

function mainObject(ep: DuplicateComparableEp) {
  return ep.episodeState?.mainProps || ep.episodeState?.props || "";
}

function locationText(ep: DuplicateComparableEp) {
  return ep.episodeState?.primaryLocation || ep.episodeState?.location || "";
}

function epComparableText(ep: DuplicateComparableEp) {
  return [
    ep.title,
    ep.hook,
    ep.storyArchetype,
    ep.coreIdea?.centralIdea,
    ep.coreIdea?.coreConflict,
    ep.coreIdea?.hookMechanic,
    ep.coreIdea?.payoffMechanic,
    mainObject(ep),
    locationText(ep),
    ep.category
  ].filter(Boolean).join(" ");
}

export function calculateSimilarity(
  incoming: DuplicateComparableEp,
  existing: DuplicateComparableEp
) {
  const incomingText = epComparableText(incoming);
  const existingText = epComparableText(existing);
  const incomingKeywords = `${incoming.coreIdea?.centralIdea ?? incoming.title} ${incoming.coreIdea?.hookMechanic ?? incoming.hook} ${incoming.coreIdea?.payoffMechanic ?? ""} ${mainObject(incoming)} ${locationText(incoming)} ${incoming.category}`;
  const existingKeywords = `${existing.coreIdea?.centralIdea ?? existing.title} ${existing.coreIdea?.hookMechanic ?? existing.hook} ${existing.coreIdea?.payoffMechanic ?? ""} ${mainObject(existing)} ${locationText(existing)} ${existing.category}`;
  const wordScore = jaccard(new Set(phraseTokens(incomingText)), new Set(phraseTokens(existingText)));
  const keywordScore = jaccard(new Set(phraseTokens(incomingKeywords)), new Set(phraseTokens(existingKeywords)));
  const phraseScore = jaccard(phraseNgrams(incomingText, 2), phraseNgrams(existingText, 2));
  const titleScore = jaccard(phraseNgrams(incoming.title, 2), phraseNgrams(existing.title, 2));
  const centralIdeaScore = jaccard(phraseNgrams(incoming.coreIdea?.centralIdea || incoming.story, 2), phraseNgrams(existing.coreIdea?.centralIdea || existing.story, 2));
  const hookScore = jaccard(phraseNgrams(incoming.coreIdea?.hookMechanic || incoming.hook, 2), phraseNgrams(existing.coreIdea?.hookMechanic || existing.hook, 2));
  const payoffScore = jaccard(phraseNgrams(incoming.coreIdea?.payoffMechanic || incoming.story, 2), phraseNgrams(existing.coreIdea?.payoffMechanic || existing.story, 2));
  const objectScore = jaccard(new Set(phraseTokens(mainObject(incoming))), new Set(phraseTokens(mainObject(existing))));
  const archetypeScore = normalizeText(incoming.storyArchetype ?? "") && normalizeText(incoming.storyArchetype ?? "") === normalizeText(existing.storyArchetype ?? "") ? 0.42 : 0;
  const sameCategory = normalizeText(incoming.category) && normalizeText(incoming.category) === normalizeText(existing.category) ? 0.08 : 0;

  const mechanicScore = Math.max(hookScore * 0.9, payoffScore * 0.95, objectScore * 0.8);
  return Math.min(1, Math.max(wordScore, keywordScore, phraseScore, titleScore * 0.9, centralIdeaScore * 0.95, mechanicScore, archetypeScore) + sameCategory);
}

export async function checkDuplicate(
  ep: DuplicateComparableEp,
  thresholdOverride?: number
): Promise<DuplicateResult> {
  const [history, episodeMemory, settings] = await Promise.all([getEpHistory(), getEpisodeMemory(), getSettings()]);
  const threshold = typeof thresholdOverride === "number" ? thresholdOverride : settings.duplicateSimilarityThreshold;
  let best: DuplicateResult = {
    isDuplicate: false,
    similarityScore: 0
  };

  for (const oldEp of history) {
    const score = calculateSimilarity(ep, oldEp);
    if (score > best.similarityScore) {
      best = {
        isDuplicate: score >= threshold,
        similarityScore: Number(score.toFixed(2)),
        matchedEpId: oldEp.id,
        matchedTitle: oldEp.title
      };
    }
  }

  for (const memory of episodeMemory) {
    const memoryComparable: DuplicateComparableEp = {
      title: memory.title,
      storyArchetype: memory.storyArchetype,
      story: memory.storyBeats.join(" "),
      hook: memory.hookMechanic,
      category: memory.template,
      coreIdea: {
        centralIdea: memory.centralIdea,
        coreConflict: memory.coreConflict,
        hookMechanic: memory.hookMechanic,
        payoffMechanic: memory.endingMechanic,
        emotionTarget: "",
        noveltyAngle: "",
        templateLogic: memory.template
      },
      episodeState: {
        primaryLocation: memory.location,
        location: memory.location,
        timeOfDay: "",
        lightingStyle: "",
        mainProps: memory.mainObject,
        continuityAnchor: "",
        characterStartPosition: "",
        characterEndPosition: "",
        lighting: "",
        props: memory.mainObject,
        voice: "",
        camera: "",
        cameraLanguage: "",
        environmentAudio: "",
        visualAnchor: "",
        emotionProgression: ""
      }
    };
    const score = calculateSimilarity(ep, memoryComparable);
    if (score > best.similarityScore) {
      best = {
        isDuplicate: score >= threshold,
        similarityScore: Number(score.toFixed(2)),
        matchedEpId: memory.epId,
        matchedTitle: memory.title
      };
    }
  }

  if (!best.isDuplicate) {
    return {
      isDuplicate: false,
      similarityScore: best.similarityScore,
      matchedEpId: best.similarityScore > 0 ? best.matchedEpId : undefined,
      matchedTitle: best.similarityScore > 0 ? best.matchedTitle : undefined
    };
  }

  return best;
}
