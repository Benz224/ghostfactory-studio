import { NextResponse } from "next/server";
import { getEpHistory } from "@/lib/storage";

export async function GET() {
  const eps = await getEpHistory();
  return NextResponse.json({ eps });
}
