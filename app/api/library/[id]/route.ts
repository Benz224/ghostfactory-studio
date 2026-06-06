import { NextResponse } from "next/server";
import { deleteEpById } from "@/lib/storage";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteEpById(decodeURIComponent(id));
  if (!deleted) return NextResponse.json({ error: "EP not found" }, { status: 404 });
  return NextResponse.json({ success: true, ep: deleted });
}
