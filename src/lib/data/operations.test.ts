import { describe, expect, it } from "vitest";

import { createLead } from "@/lib/data/operations";
import type { Database } from "@/lib/data/types";
import { buildSeed, attachWorkflowIds } from "@/lib/demo/seed";

function db(): Database {
  const seeded = buildSeed(new Date("2026-10-28T15:00:00.000Z"));
  attachWorkflowIds(seeded);
  return seeded;
}

describe("lead intake", () => {
  it("does not create a second lead when the idempotency key is reused", () => {
    const database = db();
    const actor = {
      userId: "00000000-0000-4000-8000-000000000002",
      workspaceId: "00000000-0000-4000-8000-000000000001",
      role: "owner" as const,
    };
    const before = database.leads.length;
    const first = createLead(database, actor, {
      fullName: "Casey Nguyen",
      email: "casey@example.com",
      source: "website",
      consentToContact: true,
      idempotencyKey: "inquiry-100",
    });
    const second = createLead(database, actor, {
      fullName: "Casey Nguyen",
      email: "casey@example.com",
      source: "website",
      consentToContact: true,
      idempotencyKey: "inquiry-100",
    });
    expect(second.id).toBe(first.id);
    expect(database.leads.length).toBe(before + 1);
    expect(database.tasks.filter((task) => task.leadId === first.id)).toHaveLength(1);
  });
});
