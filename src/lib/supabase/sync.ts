import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/data/types";
import { CrmError } from "@/lib/data/types";

const TABLES = [
  ["workspaces", "workspaces"],
  ["members", "workspace_members"],
  ["invitations", "workspace_invitations"],
  ["contacts", "contacts"],
  ["leads", "leads"],
  ["properties", "properties"],
  ["images", "property_images"],
  ["deals", "deals"],
  ["tasks", "tasks"],
  ["activities", "activities"],
  ["viewings", "viewings"],
  ["notifications", "notifications"],
  ["workflows", "automation_workflows"],
  ["runs", "automation_runs"],
  ["jobs", "automation_jobs"],
  ["connections", "integration_connections"],
  ["drafts", "message_drafts"],
] as const;

const NUMERIC = new Set([
  "budgetAmount",
  "priceAmount",
  "expectedValue",
  "bedrooms",
  "bathrooms",
  "areaValue",
  "qualificationScore",
  "probability",
  "buyingTimelineDays",
  "followUpDueHours",
  "taskReminderHours",
  "viewingReminderHours",
  "roundRobinOrder",
  "sortOrder",
  "retryCount",
  "attempts",
  "maxAttempts",
]);

function toCamel(row: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
    if (typeof value === "string" && NUMERIC.has(camel) && value.trim() !== "") {
      output[camel] = Number(value);
    } else {
      output[camel] = value;
    }
  }
  return output;
}

function toSnake(record: object) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    output[key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)] = value;
  }
  return output;
}

async function selectAll(client: SupabaseClient, table: string, column: string, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await client.from(table).select("*").in(column, ids);
  if (error) throw new CrmError(error.message, 400);
  return (data ?? []) as Record<string, unknown>[];
}

export async function loadDatabase(client: SupabaseClient, userId: string): Promise<Database> {
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new CrmError(profileError.message, 400);

  const { data: memberships, error: memberError } = await client
    .from("workspace_members")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true);
  if (memberError) throw new CrmError(memberError.message, 400);

  const workspaceIds = (memberships ?? []).map((row) => String(row.workspace_id));
  const { data: allMembers, error: allMemberError } = workspaceIds.length
    ? await client.from("workspace_members").select("*").in("workspace_id", workspaceIds)
    : { data: [], error: null };
  if (allMemberError) throw new CrmError(allMemberError.message, 400);

  const userIds = [...new Set((allMembers ?? []).map((row) => String(row.user_id)).concat(userId))];
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("*")
    .in("id", userIds);
  if (profilesError) throw new CrmError(profilesError.message, 400);

  const db = emptyDatabase();
  db.profiles = ((profiles ?? [profile].filter(Boolean)) as Record<string, unknown>[]).map(
    (row) => ({ ...toCamel(row), email: String(row.email ?? "") }) as Database["profiles"][number],
  );
  if (!db.profiles.some((item) => item.id === userId) && profile) {
    db.profiles.push({ ...toCamel(profile), email: String(profile.email ?? "") } as Database["profiles"][number]);
  }

  for (const [key, table] of TABLES) {
    const column = key === "workspaces" ? "id" : "workspace_id";
    const rows = await selectAll(client, table, column, workspaceIds);
    db[key] = rows.map((row) => toCamel(row)) as never;
  }
  return db;
}

export async function persistDatabase(
  client: SupabaseClient,
  before: Database,
  after: Database,
) {
  const changedProfiles = diff(before.profiles, after.profiles);
  if (changedProfiles.length > 0) {
    const { error } = await client.from("profiles").upsert(changedProfiles.map((row) => toSnake(row)));
    if (error) throw new CrmError(error.message, 400);
  }
  for (const [key, table] of TABLES) {
    const rows = diff(before[key] as { id: string }[], after[key] as { id: string }[]);
    if (rows.length === 0) continue;
    const { error } = await client.from(table).upsert(rows.map((row) => toSnake(row)));
    if (error) throw new CrmError(error.message, 400);
  }
}

function diff<T extends { id: string }>(before: T[], after: T[]): T[] {
  const previous = new Map(before.map((item) => [item.id, JSON.stringify(item)]));
  return after.filter((item) => previous.get(item.id) !== JSON.stringify(item));
}

function emptyDatabase(): Database {
  return {
    profiles: [],
    workspaces: [],
    members: [],
    invitations: [],
    contacts: [],
    leads: [],
    properties: [],
    images: [],
    deals: [],
    tasks: [],
    activities: [],
    viewings: [],
    notifications: [],
    workflows: [],
    runs: [],
    jobs: [],
    connections: [],
    drafts: [],
  };
}
