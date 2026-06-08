import meow from "../../characters/meow.json";

export type CharacterAsset = {
  id: string;
  appearance: string;
  personality: string;
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

export function getCharacterAsset(characterId = "meow") {
  return assets.find((asset) => asset.id === characterId) ?? assets[0];
}

export function buildCharacterAnchorFromAsset(asset: CharacterAsset) {
  return `${asset.appearance} ${asset.visualAnchor} ${asset.negativeRules.join(". ")}.`;
}
