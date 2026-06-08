import anime from "../../templates/anime.json";
import affiliate from "../../templates/affiliate.json";
import cuteDailyLife from "../../templates/cute-daily-life.json";
import educational from "../../templates/educational.json";
import nightmareProtocol from "../../templates/nightmare-protocol.json";
import review from "../../templates/review.json";
import sigmaCat from "../../templates/sigma-cat.json";

export type TemplatePack = {
  id: string;
  match: string[];
  coreConflict: string;
  payoffMechanic: string;
  defaultComplexity: "simple" | "medium" | "complex";
  avoid: string[];
};

const packs: TemplatePack[] = [
  nightmareProtocol,
  sigmaCat,
  cuteDailyLife,
  anime,
  affiliate,
  review,
  educational
].map((pack) => ({
  ...pack,
  defaultComplexity: pack.defaultComplexity as TemplatePack["defaultComplexity"]
}));

export function getTemplatePack(input: string): TemplatePack {
  const text = input.toLowerCase();
  return packs.find((pack) => pack.match.some((item) => text.includes(item))) ?? packs[2];
}

export function frameCountForTemplatePack(pack: TemplatePack) {
  if (pack.defaultComplexity === "complex") return 6;
  if (pack.defaultComplexity === "medium") return 4;
  return 3;
}
