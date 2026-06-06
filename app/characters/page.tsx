import { CharacterManager } from "@/components/CharacterManager";
import { getCharacters, getEpHistory } from "@/lib/storage";

export default async function CharactersPage() {
  const [characters, history] = await Promise.all([getCharacters(), getEpHistory()]);
  const epCounts = Object.fromEntries(characters.map((character) => [character.id, history.filter((ep) => ep.characterId === character.id).length]));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-[#2563EB]">Characters</p>
        <h1 className="text-3xl font-semibold">Character System</h1>
        <p className="mt-2 text-sm text-[#64748B]">Create and manage reusable AI content characters.</p>
      </div>
      <CharacterManager initialCharacters={characters} epCounts={epCounts} />
    </div>
  );
}
