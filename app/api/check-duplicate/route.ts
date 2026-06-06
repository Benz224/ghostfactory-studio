import { NextResponse } from "next/server";
import { checkDuplicate } from "@/lib/duplicate-checker";
import type { GhostEp } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as
    | Pick<GhostEp, "title" | "story" | "hook" | "category">
    | { ep: Pick<GhostEp, "title" | "story" | "hook" | "category">; threshold?: number };
  const ep = "ep" in body ? body.ep : body;
  const threshold = "ep" in body ? body.threshold : undefined;
  const result = await checkDuplicate(ep, threshold);
  return NextResponse.json(result);
}
