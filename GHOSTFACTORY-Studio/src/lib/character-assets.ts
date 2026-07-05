import meow from "../../characters/meow.json";
import type { EpisodeVisualLock, GhostCharacter } from "./types";

export type CharacterAsset = {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  visualStyle?: string;
  appearance: string;
  promptCapsule?: string;
  personality: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  voiceProvider?: string;
  voiceId?: string;
  referenceAudioUrl?: string;
  voiceProfile?: {
    preset?: string;
    gender?: string;
    age?: string;
    tone?: string;
    energy?: string;
    speakingSpeed?: string;
    accent?: string;
    personality?: string;
  };
  voice: {
    preset: string;
    gender: string;
    age: string;
    tone: string;
    energy: string;
    speakingSpeed: string;
    accent: string;
  };
  visualAnchor: string;
  negativeRules: string[];
  defaultCameraStyle: string;
  defaultSpeechPattern: string;
};

const assets: CharacterAsset[] = [meow];

function compactText(input?: string, max = 220) {
  const clean = (input ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max - 1).replace(/\s+\S*$/, "").trim();
  return `${clipped}.`;
}

export function findCharacterAsset(characterId?: string) {
  return characterId ? assets.find((asset) => asset.id === characterId) : undefined;
}

export function getCharacterAsset(characterId = "meow") {
  return findCharacterAsset(characterId) ?? assets[0];
}

export function buildCharacterAnchorFromAsset(asset: CharacterAsset) {
  return `${asset.appearance} ${asset.visualAnchor} ${asset.negativeRules.join(". ")}.`;
}

export function buildCharacterPromptCapsule({
  asset,
  character,
  fallbackName = "Character",
  fallbackStyle = "cinematic 3D"
}: {
  asset?: CharacterAsset;
  character?: Partial<GhostCharacter>;
  fallbackName?: string;
  fallbackStyle?: string;
}) {
  if (asset?.promptCapsule) return compactText(asset.promptCapsule, 220);
  if (asset?.id === "meow") {
    return "Meow, fluffy orange tabby with orange stripes, round expressive face, large dark eyes, pink nose, cream muzzle and paws, black collar, plain round gold pendant, Pixar-quality 3D.";
  }

  const name = character?.name || asset?.name || fallbackName;
  const type = character?.type || asset?.type;
  const description = character?.description || asset?.description || asset?.appearance;
  const style = character?.visualStyle || asset?.visualStyle || fallbackStyle;
  return compactText(`${name}${type ? `, ${type}` : ""}${description ? `, ${description}` : ""}, ${style}.`, 220);
}

export function buildCharacterReferenceBundle(character?: Partial<GhostCharacter>, asset?: CharacterAsset) {
  const refs = [
    ...(asset?.referenceImageUrls ?? []),
    asset?.referenceImageUrl,
    ...(character?.referenceImages ?? []),
    character?.referenceImageUrl,
    ...(character?.referenceImageUrls ?? []),
    character?.imageUrl,
    character?.imagePath
  ].filter((value): value is string => Boolean(value && !/^https?:\/\/example\.com/i.test(value) && !/placeholder|fake-reference/i.test(value)));
  return Array.from(new Set(refs));
}

function splitProps(value?: string) {
  return (value ?? "")
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function buildEpisodeVisualLock({
  character,
  asset,
  episodeState
}: {
  character?: Partial<GhostCharacter>;
  asset?: CharacterAsset;
  episodeState?: { primaryLocation?: string; location?: string; lightingStyle?: string; lighting?: string; continuityAnchor?: string; mainProps?: string; props?: string };
}): EpisodeVisualLock {
  const characterId = character?.id || asset?.id || "character";
  const characterName = character?.name || asset?.name || (characterId === "meow" ? "Meow" : "Character");
  const characterCapsule = buildCharacterPromptCapsule({ asset, character, fallbackName: characterName, fallbackStyle: character?.visualStyle || asset?.visualStyle || "cinematic 3D" });
  return {
    visualLockId: `${characterId}:visual:v1`,
    characterId,
    characterName,
    characterCapsule,
    styleCapsule: compactText(character?.visualStyle || asset?.visualStyle || "cinematic 3D, commercial quality visuals", 140),
    referenceImageUrls: buildCharacterReferenceBundle(character, asset),
    primaryLocation: episodeState?.primaryLocation || episodeState?.location || "",
    lightingStyle: episodeState?.lightingStyle || episodeState?.lighting || "",
    continuityAnchor: episodeState?.continuityAnchor || "",
    mainProps: splitProps(episodeState?.mainProps || episodeState?.props),
    locked: true
  };
}

export function normalizeEpisodeVisualLock(lock: Partial<EpisodeVisualLock> | undefined, fallback: EpisodeVisualLock): EpisodeVisualLock {
  return {
    ...fallback,
    ...(lock ?? {}),
    referenceImageUrls: Array.isArray(lock?.referenceImageUrls) ? lock.referenceImageUrls.filter(Boolean) : fallback.referenceImageUrls,
    mainProps: Array.isArray(lock?.mainProps) ? lock.mainProps.filter(Boolean) : fallback.mainProps,
    locked: lock?.locked ?? fallback.locked
  };
}

export function ensureEpisodeVisualLock(input: {
  lock?: Partial<EpisodeVisualLock>;
  character?: Partial<GhostCharacter>;
  asset?: CharacterAsset;
  episodeState?: { primaryLocation?: string; location?: string; lightingStyle?: string; lighting?: string; continuityAnchor?: string; mainProps?: string; props?: string };
}) {
  return normalizeEpisodeVisualLock(input.lock, buildEpisodeVisualLock(input));
}
