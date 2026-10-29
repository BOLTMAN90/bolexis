import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

import { resolveDataMode } from "@/lib/config";
import { currentUserId } from "@/lib/crm/session";
import { demoUploadPath } from "@/lib/demo/store";

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  if (resolveDataMode().mode !== "demo") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { name } = await context.params;
  if (!/^[\w.-]+$/.test(name)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const bytes = await readFile(demoUploadPath(name));
    const type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new NextResponse(bytes, { headers: { "content-type": type } });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
