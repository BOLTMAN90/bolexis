import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { actorIn } from "@/lib/crm/session";
import { acceptInvitation, createInvitation } from "@/lib/data/operations";
import { CrmError } from "@/lib/data/types";
import { attachWorkflowIds, buildSeed } from "@/lib/demo/seed";
import { canAdministerWorkspace, canManageMembers, canMutateCrm } from "@/lib/domain/assignment";

const owner = {
  userId: "00000000-0000-4000-8000-000000000002",
  workspaceId: "00000000-0000-4000-8000-000000000001",
  role: "owner" as const,
};

function db() {
  const seeded = buildSeed(new Date("2026-10-28T15:00:00.000Z"));
  attachWorkflowIds(seeded);
  return seeded;
}

describe("workspace roles", () => {
  it("lets agents change records and keeps viewers read-only", () => {
    expect(canMutateCrm("agent")).toBe(true);
    expect(canMutateCrm("viewer")).toBe(false);
    expect(canAdministerWorkspace("admin")).toBe(true);
    expect(canAdministerWorkspace("agent")).toBe(false);
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("viewer")).toBe(false);
  });

  it("rejects a workspace the user does not belong to", () => {
    const database = db();
    expect(() => actorIn(database, owner.userId, "00000000-0000-4000-8000-000000000099")).toThrow(CrmError);
    expect(() => actorIn(database, owner.userId, "00000000-0000-4000-8000-000000000099")).toThrow(
      /do not belong/,
    );
  });

  it("stores an invitation as a hash and accepts it only for that email", () => {
    const database = db();
    const token = "invite-token-shown-once";
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitation = createInvitation(database, owner, {
      email: "NEW.Agent@Example.com",
      role: "agent",
      tokenHash,
    });
    expect(invitation.tokenHash).toBe(tokenHash);
    expect(JSON.stringify(invitation)).not.toContain(token);

    const outsider = {
      id: "00000000-0000-4000-8000-000000000090",
      fullName: "New Agent",
      email: "new.agent@example.com",
      phone: null,
      timezone: "America/New_York",
      locale: "en-US",
      avatarPath: null,
      createdAt: invitation.createdAt,
      updatedAt: invitation.createdAt,
    };
    database.profiles.push(outsider);
    expect(() => acceptInvitation(database, owner.userId, token)).toThrow(/different email/);
    const member = acceptInvitation(database, outsider.id, token);
    expect(member.workspaceId).toBe(owner.workspaceId);
    expect(member.role).toBe("agent");
    expect(invitation.acceptedAt).toBeTruthy();
  });
});
