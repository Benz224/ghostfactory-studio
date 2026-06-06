import type { DuplicateResult, GhostEp } from "./types";
import { getEpHistory, getSettings } from "./storage";

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordTokens(input: string) {
  const normalized = normalizeText(input);
  const spacedThai = normalized.replace(/([\u0E00-\u0E7F])/g, " $1 ");
  return spacedThai
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function ngrams(text: string, size: number) {
  const compact = normalizeText(text).replace(/\s+/g, "");
  const parts = new Set<string>();
  if (compact.length <= size) {
    if (compact) parts.add(compact);
    return parts;
  }
  for (let i = 0; i <= compact.length - size; i += 1) {
    parts.add(compact.slice(i, i + size));
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

function epComparableText(ep: Pick<GhostEp, "title" | "story" | "hook" | "category">) {
  return `${ep.title} ${ep.story} ${ep.hook} ${ep.category}`;
}

export function calculateSimilarity(
  incoming: Pick<GhostEp, "title" | "story" | "hook" | "category">,
  existing: Pick<GhostEp, "title" | "story" | "hook" | "category">
) {
  const incomingText = epComparableText(incoming);
  const existingText = epComparableText(existing);
  const incomingKeywords = `${incoming.title} ${incoming.hook} ${incoming.category}`;
  const existingKeywords = `${existing.title} ${existing.hook} ${existing.category}`;
  const wordScore = jaccard(new Set(wordTokens(incomingText)), new Set(wordTokens(existingText)));
  const keywordScore = jaccard(new Set(wordTokens(incomingKeywords)), new Set(wordTokens(existingKeywords)));
  const charScore = jaccard(ngrams(incomingText, 3), ngrams(existingText, 3));
  const titleScore = jaccard(ngrams(incoming.title, 2), ngrams(existing.title, 2));
  const storyScore = jaccard(ngrams(incoming.story, 3), ngrams(existing.story, 3));
  const sameCategory = normalizeText(incoming.category) && normalizeText(incoming.category) === normalizeText(existing.category) ? 0.08 : 0;

  return Math.min(1, Math.max(wordScore, keywordScore, charScore, titleScore * 0.9, storyScore * 0.95) + sameCategory);
}

export async function checkDuplicate(
  ep: Pick<GhostEp, "title" | "story" | "hook" | "category">,
  thresholdOverride?: number
): Promise<DuplicateResult> {
  const [history, settings] = await Promise.all([getEpHistory(), getSettings()]);
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
