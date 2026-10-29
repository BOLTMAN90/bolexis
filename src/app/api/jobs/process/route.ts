import { NextResponse } from "next/server";

import { resolveDataMode } from "@/lib/config";
import { processReminders } from "@/lib/data/operations";
import { withDemoDatabase } from "@/lib/demo/store";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret) return NextResponse.json({ status: "not_configured" }, { status: 503 });
  if (header !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (resolveDataMode().mode !== "demo") {
    return NextResponse.json(
      { status: "not_run", message: "Configure a worker against Supabase before scheduling this route in production." },
      { status: 501 },
    );
  }
  const result = await withDemoDatabase((db) => {
    const totals = db.workspaces.map((workspace) => processReminders(db, workspace.id));
    return totals;
  });
  return NextResponse.json({ status: "succeeded", result });
}
