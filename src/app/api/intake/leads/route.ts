import { NextResponse } from "next/server";

import { resolveDataMode } from "@/lib/config";
import { actorIn } from "@/lib/crm/session";
import { createLead } from "@/lib/data/operations";
import type { Database } from "@/lib/data/types";
import { CrmError } from "@/lib/data/types";
import { withDemoDatabase } from "@/lib/demo/store";
import { intakeKeyMatches } from "@/lib/security/intake";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDatabase, persistDatabase } from "@/lib/supabase/sync";
import { intakeSchema } from "@/lib/validation/crm";

function ownerId(db: Database, workspaceId: string) {
  return (
    db.members.find((member) => member.workspaceId === workspaceId && member.role === "owner" && member.active)
      ?.userId ?? null
  );
}

function accept(db: Database, workspaceId: string, token: string, input: ReturnType<typeof intakeSchema.parse>) {
  const workspace = db.workspaces.find((item) => item.id === workspaceId);
  if (!workspace || !intakeKeyMatches(workspace.intakeKeyHash, token)) {
    throw new CrmError("Workspace or intake key was rejected.", 401);
  }
  const userId = ownerId(db, workspaceId);
  if (!userId) throw new CrmError("Workspace has no owner.", 409);
  const lead = createLead(db, actorIn(db, userId, workspaceId), {
    ...input,
    email: input.email || null,
    idempotencyKey: input.idempotencyKey,
  });
  return { id: lead.id, score: lead.qualificationScore, assignedUserId: lead.assignedUserId };
}

export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const workspaceId = request.headers.get("x-workspace-id") ?? "";
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = intakeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid inquiry." }, { status: 400 });
  }

  try {
    const mode = resolveDataMode();
    if (mode.mode === "demo") {
      return NextResponse.json(await withDemoDatabase((db) => accept(db, workspaceId, token, parsed.data)), {
        status: 201,
      });
    }
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Service role is not configured." }, { status: 503 });
    const ownerLookup = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();
    if (ownerLookup.error || !ownerLookup.data?.user_id) {
      return NextResponse.json({ error: "Workspace was rejected." }, { status: 401 });
    }
    const db = await loadDatabase(admin, String(ownerLookup.data.user_id));
    const snapshot = structuredClone(db);
    const result = accept(db, workspaceId, token, parsed.data);
    await persistDatabase(admin, snapshot, db);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = error instanceof CrmError ? error.status : 500;
    const message = error instanceof CrmError ? error.message : "Intake failed.";
    return NextResponse.json({ error: message }, { status });
  }
}
