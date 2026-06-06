import { NextResponse } from "next/server";
import { getProjects, saveProjects } from "@/lib/storage";
import type { Project } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ projects: await getProjects() });
}

export async function POST(request: Request) {
  const projects = (await request.json()) as Project[];
  return NextResponse.json({ projects: await saveProjects(projects) });
}
