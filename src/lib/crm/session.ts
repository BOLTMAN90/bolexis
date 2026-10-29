import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readDemoSession, WORKSPACE_COOKIE } from "@/lib/auth/demo-session";
import { resolveDataMode, supabaseAuthConfigured } from "@/lib/config";
import { membershipFor, workspaceOf } from "@/lib/data/operations";
import type { Actor, Database, Profile, Workspace } from "@/lib/data/types";
import { CrmError } from "@/lib/data/types";
import { withDemoDatabase } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/server";
import { loadDatabase, persistDatabase } from "@/lib/supabase/sync";

export type AppContext = {
  user: Profile;
  workspace: Workspace | null;
  role: Actor["role"] | null;
  workspaces: Workspace[];
  mode: "demo" | "supabase";
};

type ActiveSession = { kind: "demo" | "supabase"; userId: string };

async function activeSession(): Promise<ActiveSession | null> {
  const mode = resolveDataMode();
  if (mode.mode === "unconfigured") return null;
  if (mode.mode === "demo") {
    const jar = await cookies();
    const demo = readDemoSession(jar.get("bolexis_demo")?.value);
    if (demo) return { kind: "demo", userId: demo.userId };
  }
  if (!supabaseAuthConfigured()) return null;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return user ? { kind: "supabase", userId: user.id } : null;
}

export async function currentUserId(): Promise<string | null> {
  return (await activeSession())?.userId ?? null;
}

export async function withCrm<T>(fn: (db: Database, userId: string) => T | Promise<T>): Promise<T> {
  const session = await activeSession();
  if (!session) redirect("/login");
  if (session.kind === "demo") return withDemoDatabase((db) => fn(db, session.userId));
  const supabase = await createClient();
  if (!supabase) redirect("/setup");
  const db = await loadDatabase(supabase, session.userId);
  const snapshot = structuredClone(db);
  const result = await fn(db, session.userId);
  await persistDatabase(supabase, snapshot, db);
  return result;
}

export async function getContext(): Promise<AppContext | null> {
  const session = await activeSession();
  if (!session) return null;
  const requested = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  return withCrm((db, id) => {
    const user = db.profiles.find((profile) => profile.id === id);
    if (!user) throw new CrmError("Profile not found.", 404);
    const memberships = db.members.filter((member) => member.userId === id && member.active);
    const workspaces = db.workspaces.filter((workspace) =>
      memberships.some((member) => member.workspaceId === workspace.id),
    );
    const workspace = workspaces.find((item) => item.id === requested) ?? workspaces[0] ?? null;
    const role = workspace ? (membershipFor(db, id, workspace.id)?.role ?? null) : null;
    return {
      user,
      workspaces,
      workspace,
      role,
      mode: session.kind,
    };
  });
}

export async function requireActor(): Promise<Actor & { user: Profile; workspace: Workspace }> {
  const context = await getContext();
  if (!context) redirect("/login");
  if (!context.workspace || !context.role) redirect("/onboarding");
  return {
    userId: context.user.id,
    workspaceId: context.workspace.id,
    role: context.role,
    user: context.user,
    workspace: context.workspace,
  };
}

export function actorIn(db: Database, userId: string, workspaceId: string): Actor {
  const membership = membershipFor(db, userId, workspaceId);
  if (!membership) throw new CrmError("You do not belong to this workspace.", 403);
  workspaceOf(db, workspaceId);
  return { userId, workspaceId, role: membership.role };
}
