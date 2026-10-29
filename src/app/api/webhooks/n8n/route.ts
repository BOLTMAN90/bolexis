import { NextResponse } from "next/server";

import { resolveDataMode } from "@/lib/config";
import { processReminders } from "@/lib/data/operations";
import { withDemoDatabase } from "@/lib/demo/store";
import { verifyWebhook } from "@/lib/domain/webhook";

export async function POST(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret || resolveDataMode().mode === "unconfigured") {
    return NextResponse.json({ status: "not_configured" }, { status: 503 });
  }
  const raw = await request.text();
  const verified = verifyWebhook({
    secret,
    timestamp: request.headers.get("x-bolexis-timestamp"),
    signature: request.headers.get("x-bolexis-signature"),
    rawBody: raw,
  });
  if (!verified.ok) return NextResponse.json({ error: "Webhook rejected." }, { status: 401 });
  let body: { workspaceId?: string; type?: string };
  try {
    body = JSON.parse(raw) as { workspaceId?: string; type?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body.workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  if (body.type === "reminders" && resolveDataMode().mode === "demo") {
    const result = await withDemoDatabase((db) => processReminders(db, body.workspaceId ?? ""));
    return NextResponse.json({ status: "succeeded", applied: "reminders", result });
  }
  return NextResponse.json({ status: "accepted", applied: false });
}
