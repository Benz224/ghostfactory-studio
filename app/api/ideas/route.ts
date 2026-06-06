import { NextResponse } from "next/server";
import { getIdeas, incrementIdeaUsage, saveIdeas } from "@/lib/storage";
import type { Idea } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ ideas: await getIdeas() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (body.useIdeaId) {
    return NextResponse.json({ idea: await incrementIdeaUsage(body.useIdeaId) });
  }
  return NextResponse.json({ ideas: await saveIdeas(body as Idea[]) });
}
