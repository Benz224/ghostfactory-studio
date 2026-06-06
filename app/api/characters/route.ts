import { NextResponse } from "next/server";
import { getCharacters, saveCharacters } from "@/lib/storage";
import type { GhostCharacter } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ characters: await getCharacters() });
}

export async function POST(request: Request) {
  const characters = (await request.json()) as GhostCharacter[];
  return NextResponse.json({ characters: await saveCharacters(characters) });
}
