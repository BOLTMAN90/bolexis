export const WORKSPACE_ROLES = ["owner", "admin", "agent", "viewer"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export type AssignmentCandidate = {
  userId: string;
  role: WorkspaceRole;
  active: boolean;
  roundRobinOrder: number;
};

export type AssignmentStrategy = "manual" | "round_robin" | "specific_agent";

export type AssignmentResult = {
  assignedUserId: string | null;
  reason: string;
};

const ELIGIBLE_ROLES: WorkspaceRole[] = ["owner", "admin", "agent"];

export function canMutateCrm(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "agent";
}

export function canAdministerWorkspace(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function eligibleAssignees(candidates: AssignmentCandidate[]): AssignmentCandidate[] {
  return candidates
    .filter((candidate) => candidate.active && ELIGIBLE_ROLES.includes(candidate.role))
    .sort((a, b) => {
      if (a.roundRobinOrder !== b.roundRobinOrder) {
        return a.roundRobinOrder - b.roundRobinOrder;
      }
      return a.userId.localeCompare(b.userId);
    });
}

export function assignLead(input: {
  strategy: AssignmentStrategy;
  candidates: AssignmentCandidate[];
  requestedUserId?: string | null;
  specificUserId?: string | null;
  lastAssignedUserId?: string | null;
}): AssignmentResult {
  if (input.strategy === "manual") {
    if (!input.requestedUserId) {
      return { assignedUserId: null, reason: "Manual assignment left the lead unassigned." };
    }
    const match = eligibleAssignees(input.candidates).find(
      (candidate) => candidate.userId === input.requestedUserId,
    );
    if (!match) {
      return {
        assignedUserId: null,
        reason: "The requested agent is not an active assignable member.",
      };
    }
    return { assignedUserId: match.userId, reason: "Assigned to the requested agent." };
  }

  const eligible = eligibleAssignees(input.candidates);
  if (eligible.length === 0) {
    return {
      assignedUserId: null,
      reason: "No active agent, admin, or owner is available.",
    };
  }

  if (input.strategy === "specific_agent") {
    const match = eligible.find((candidate) => candidate.userId === input.specificUserId);
    if (!match) {
      return {
        assignedUserId: null,
        reason: "The configured agent is not available.",
      };
    }
    return { assignedUserId: match.userId, reason: "Assigned to the configured agent." };
  }

  const lastIndex = eligible.findIndex(
    (candidate) => candidate.userId === input.lastAssignedUserId,
  );
  const next = eligible[(lastIndex + 1) % eligible.length];
  return {
    assignedUserId: next.userId,
    reason: "Assigned by round-robin among active agents.",
  };
}
