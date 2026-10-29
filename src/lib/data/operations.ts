import { createHash } from "node:crypto";

import { assignLead, canAdministerWorkspace, canMutateCrm } from "@/lib/domain/assignment";
import { claimIdempotency } from "@/lib/domain/idempotency";
import { scoreLead } from "@/lib/domain/lead-score";
import {
  countNewLeadsInRange,
  followUpCompletionRate,
  isQualifiedStatus,
  leadToViewingRate,
  leadsBySource,
  overdueTasks,
  viewingToOfferRate,
} from "@/lib/domain/metrics";
import { monthRange } from "@/lib/domain/money";
import { matchProperties } from "@/lib/domain/property-match";
import {
  DEFAULT_STAGE_PROBABILITY,
  PIPELINE_STAGES,
  closedWonValue,
  dealsByStage,
  outcomeForStage,
  totalPipelineValue,
  weightedPipelineValue,
  type PipelineStage,
} from "@/lib/domain/pipeline";
import { findAgentConflict, validateViewingWindow } from "@/lib/domain/viewing-conflicts";
import {
  type Actor,
  type Activity,
  type AutomationRun,
  type Contact,
  type Database,
  type Deal,
  type Invitation,
  type Lead,
  type Membership,
  type MessageDraft,
  type Notification,
  type Property,
  type Task,
  type Viewing,
  type Workspace,
  CrmError,
} from "@/lib/data/types";

export function nid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/[^\d+]/g, "") ?? "";
  return cleaned.length > 0 ? cleaned : null;
}

function assertWriter(actor: Actor) {
  if (!canMutateCrm(actor.role)) {
    throw new CrmError("You do not have permission to change records in this workspace.", 403);
  }
}

function assertAdmin(actor: Actor) {
  if (!canAdministerWorkspace(actor.role)) {
    throw new CrmError("Workspace administration requires an owner or admin role.", 403);
  }
}

export function workspaceOf(db: Database, workspaceId: string): Workspace {
  const workspace = db.workspaces.find((item) => item.id === workspaceId);
  if (!workspace) throw new CrmError("Workspace not found.", 404);
  return workspace;
}

export function membershipFor(
  db: Database,
  userId: string,
  workspaceId: string,
): Membership | null {
  return (
    db.members.find(
      (member) =>
        member.userId === userId && member.workspaceId === workspaceId && member.active,
    ) ?? null
  );
}

function addActivity(
  db: Database,
  input: Omit<Activity, "id" | "createdAt"> & { createdAt?: string },
): Activity {
  const activity: Activity = {
    id: nid(),
    createdAt: input.createdAt ?? nowIso(),
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    eventType: input.eventType,
    recordType: input.recordType,
    recordId: input.recordId,
    metadata: input.metadata,
    beforeValue: input.beforeValue,
    afterValue: input.afterValue,
  };
  db.activities.push(activity);
  return activity;
}

function addNotification(
  db: Database,
  input: Omit<Notification, "id" | "createdAt" | "readAt" | "providerMessageId"> & {
    createdAt?: string;
  },
): Notification | null {
  if (input.dedupeKey) {
    const existing = db.notifications.find(
      (item) =>
        item.workspaceId === input.workspaceId &&
        item.recipientId === input.recipientId &&
        item.dedupeKey === input.dedupeKey,
    );
    if (existing) return null;
  }
  const notification: Notification = {
    id: nid(),
    createdAt: input.createdAt ?? nowIso(),
    readAt: null,
    providerMessageId: null,
    workspaceId: input.workspaceId,
    recipientId: input.recipientId,
    channel: input.channel,
    title: input.title,
    body: input.body,
    dedupeKey: input.dedupeKey,
    deliveryStatus: input.deliveryStatus,
    errorDetail: input.errorDetail,
  };
  db.notifications.push(notification);
  return notification;
}

export function defaultWorkflows(workspaceId: string, createdAt: string) {
  return [
    {
      id: nid(),
      workspaceId,
      key: "new_lead_intake",
      name: "New lead intake",
      description:
        "Validate an inquiry, score it, assign an agent, create a follow-up, and notify that agent.",
      triggerType: "lead_created" as const,
      config: { actions: ["validate", "score", "assign", "create_task", "notify"] },
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: nid(),
      workspaceId,
      key: "follow_up_reminders",
      name: "Follow-up reminders",
      description: "Notify assignees when incomplete tasks enter the reminder window.",
      triggerType: "task_due" as const,
      config: { actions: ["select_due_tasks", "queue_notification", "email_if_configured"] },
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: nid(),
      workspaceId,
      key: "viewing_reminders",
      name: "Viewing reminders",
      description: "Queue reminders for upcoming property viewings.",
      triggerType: "viewing_upcoming" as const,
      config: { actions: ["select_upcoming", "queue_notification"] },
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: nid(),
      workspaceId,
      key: "lead_assignment",
      name: "Lead assignment",
      description: "Assign unassigned leads with the workspace rule.",
      triggerType: "lead_unassigned" as const,
      config: { actions: ["round_robin_or_rule"] },
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: nid(),
      workspaceId,
      key: "follow_up_sequence",
      name: "Lead follow-up sequence",
      description: "Prepare follow-up drafts. An agent must approve a message before it is sent.",
      triggerType: "sequence_step" as const,
      config: { requiresApproval: true, steps: [{ delayHours: 24 }, { delayHours: 72 }] },
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export type LeadDraft = {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  source: Lead["source"];
  status?: PipelineStage;
  assignedUserId?: string | null;
  budgetAmount?: number | null;
  budgetCurrency?: string;
  preferredLocation?: string | null;
  propertyType?: Lead["propertyType"];
  buyingTimelineDays?: number | null;
  notes?: string;
  preferEmail?: boolean;
  preferPhone?: boolean;
  preferSms?: boolean;
  consentToContact: boolean;
  idempotencyKey?: string | null;
};

function candidates(db: Database, workspaceId: string) {
  return db.members
    .filter((member) => member.workspaceId === workspaceId)
    .map((member) => ({
      userId: member.userId,
      role: member.role,
      active: member.active,
      roundRobinOrder: member.roundRobinOrder,
    }));
}

function linkContact(
  db: Database,
  actor: Actor,
  input: LeadDraft,
  email: string | null,
  phone: string | null,
  timestamp: string,
): { contact: Contact; warning: string | null } {
  const inWorkspace = db.contacts.filter(
    (contact) => contact.workspaceId === actor.workspaceId && !contact.archivedAt,
  );
  const byEmail = email ? inWorkspace.filter((contact) => contact.email === email) : [];
  const byPhone = phone ? inWorkspace.filter((contact) => contact.phone === phone) : [];
  let warning: string | null = null;
  let contact = byEmail.length === 1 ? byEmail[0] : byPhone.length === 1 ? byPhone[0] : null;
  if (byEmail.length === 1 && byPhone.length === 1 && byEmail[0].id !== byPhone[0].id) {
    contact = byEmail[0];
    warning =
      "Email and phone match different contacts. The lead was linked to the email match and the records were not merged.";
  } else if (byEmail.length > 1 || byPhone.length > 1) {
    warning = "More than one contact matches. A new contact was created instead of merging records.";
    contact = null;
  }
  if (!contact) {
    contact = {
      id: nid(),
      workspaceId: actor.workspaceId,
      fullName: input.fullName.trim(),
      email,
      phone,
      contactType: "buyer",
      notes: "",
      consentEmail: input.consentToContact && input.preferEmail !== false,
      consentSms: input.consentToContact && input.preferSms === true,
      consentRecordedAt: input.consentToContact ? timestamp : null,
      archivedAt: null,
      createdBy: actor.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.contacts.push(contact);
  }
  return { contact, warning };
}

export function createLead(db: Database, actor: Actor, input: LeadDraft): Lead {
  assertWriter(actor);
  const workspace = workspaceOf(db, actor.workspaceId);
  if (input.idempotencyKey) {
    const existing = db.leads.find(
      (lead) =>
        lead.workspaceId === actor.workspaceId && lead.idempotencyKey === input.idempotencyKey,
    );
    if (existing) return existing;
  }
  const timestamp = nowIso();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const { contact, warning } = linkContact(db, actor, input, email, phone, timestamp);
  const scored = scoreLead({
    email,
    phone,
    budgetAmount: input.budgetAmount ?? null,
    preferredLocation: input.preferredLocation ?? null,
    propertyType: input.propertyType ?? null,
    buyingTimelineDays: input.buyingTimelineDays ?? null,
    consentToContact: input.consentToContact,
  });
  const requested = input.assignedUserId ?? null;
  const assignment = assignLead({
    strategy: requested ? "manual" : workspace.assignmentStrategy,
    candidates: candidates(db, actor.workspaceId),
    requestedUserId: requested,
    specificUserId: workspace.assignmentMemberId
      ? db.members.find((member) => member.id === workspace.assignmentMemberId)?.userId
      : null,
    lastAssignedUserId: workspace.lastRoundRobinUserId,
  });
  if (!requested && assignment.assignedUserId && workspace.assignmentStrategy === "round_robin") {
    workspace.lastRoundRobinUserId = assignment.assignedUserId;
    workspace.updatedAt = timestamp;
  }
  const lead: Lead = {
    id: nid(),
    workspaceId: actor.workspaceId,
    contactId: contact.id,
    fullName: input.fullName.trim(),
    email,
    phone,
    source: input.source,
    status: input.status ?? "new",
    assignedUserId: assignment.assignedUserId,
    budgetAmount: input.budgetAmount ?? null,
    budgetCurrency: (input.budgetCurrency ?? workspace.currency).toUpperCase(),
    preferredLocation: input.preferredLocation?.trim() || null,
    propertyType: input.propertyType ?? null,
    buyingTimelineDays: input.buyingTimelineDays ?? null,
    notes: input.notes?.trim() ?? "",
    qualificationScore: scored.score,
    scoreExplanation: scored.rules,
    preferEmail: input.preferEmail ?? true,
    preferPhone: input.preferPhone ?? false,
    preferSms: input.preferSms ?? false,
    consentToContact: input.consentToContact,
    consentRecordedAt: input.consentToContact ? timestamp : null,
    idempotencyKey: input.idempotencyKey ?? null,
    archivedAt: null,
    createdBy: actor.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.leads.push(lead);
  const due = new Date(Date.now() + workspace.followUpDueHours * 60 * 60 * 1000).toISOString();
  const taskKey = `intake-followup:${input.idempotencyKey ?? lead.id}`;
  if (!db.tasks.some((task) => task.workspaceId === actor.workspaceId && task.idempotencyKey === taskKey)) {
    db.tasks.push({
      id: nid(),
      workspaceId: actor.workspaceId,
      title: `Follow up with ${lead.fullName}`,
      description: "First follow-up created by new lead intake.",
      priority: scored.score >= 70 ? "high" : "medium",
      dueAt: due,
      status: "pending",
      assignedUserId: assignment.assignedUserId,
      leadId: lead.id,
      dealId: null,
      propertyId: null,
      idempotencyKey: taskKey,
      completedAt: null,
      reminderSentAt: null,
      createdBy: actor.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "lead.created",
    recordType: "lead",
    recordId: lead.id,
    metadata: { assignmentReason: assignment.reason, duplicateWarning: warning },
    beforeValue: null,
    afterValue: { status: lead.status, score: lead.qualificationScore },
  });
  if (assignment.assignedUserId) {
    addNotification(db, {
      workspaceId: actor.workspaceId,
      recipientId: assignment.assignedUserId,
      channel: "in_app",
      title: "New lead assigned",
      body: `${lead.fullName} was assigned to you. ${assignment.reason}`,
      dedupeKey: `lead-assigned:${lead.id}`,
      deliveryStatus: "queued",
      errorDetail: null,
    });
  }
  recordRun(db, actor.workspaceId, "new_lead_intake", `intake:${input.idempotencyKey ?? lead.id}`, {
    externalEmail: "not_configured",
    externalWorkflow: "not_configured",
    assignment: assignment.reason,
  });
  return lead;
}

function recordRun(
  db: Database,
  workspaceId: string,
  workflowKey: string,
  idempotencyKey: string,
  metadata: Record<string, unknown>,
  status: AutomationRun["status"] = "succeeded",
  errorDetail: string | null = null,
) {
  const workflow = db.workflows.find(
    (item) => item.workspaceId === workspaceId && item.key === workflowKey,
  );
  if (!workflow) return;
  const map = new Map(db.runs.map((run) => [`${run.workspaceId}:${run.idempotencyKey}`, run]));
  claimIdempotency(map, `${workspaceId}:${idempotencyKey}`, () => {
    const timestamp = nowIso();
    const run: AutomationRun = {
      id: nid(),
      workspaceId,
      workflowId: workflow.id,
      status,
      correlationId: nid(),
      idempotencyKey,
      startedAt: timestamp,
      finishedAt: timestamp,
      errorDetail,
      retryCount: 0,
      metadata,
      createdAt: timestamp,
    };
    db.runs.push(run);
    return run;
  });
}

export function updateLead(
  db: Database,
  actor: Actor,
  leadId: string,
  patch: Partial<LeadDraft> & { status?: PipelineStage; archived?: boolean },
): Lead {
  assertWriter(actor);
  const lead = db.leads.find((item) => item.id === leadId && item.workspaceId === actor.workspaceId);
  if (!lead) throw new CrmError("Lead not found.", 404);
  const before = { status: lead.status, assignedUserId: lead.assignedUserId };
  if (patch.fullName) lead.fullName = patch.fullName.trim();
  if (patch.email !== undefined) lead.email = normalizeEmail(patch.email);
  if (patch.phone !== undefined) lead.phone = normalizePhone(patch.phone);
  if (patch.source) lead.source = patch.source;
  if (patch.budgetAmount !== undefined) lead.budgetAmount = patch.budgetAmount;
  if (patch.budgetCurrency) lead.budgetCurrency = patch.budgetCurrency.toUpperCase();
  if (patch.preferredLocation !== undefined) {
    lead.preferredLocation = patch.preferredLocation?.trim() || null;
  }
  if (patch.propertyType !== undefined) lead.propertyType = patch.propertyType;
  if (patch.buyingTimelineDays !== undefined) lead.buyingTimelineDays = patch.buyingTimelineDays;
  if (patch.notes !== undefined) lead.notes = patch.notes;
  if (patch.preferEmail !== undefined) lead.preferEmail = patch.preferEmail;
  if (patch.preferPhone !== undefined) lead.preferPhone = patch.preferPhone;
  if (patch.preferSms !== undefined) lead.preferSms = patch.preferSms;
  if (patch.consentToContact !== undefined) {
    lead.consentToContact = patch.consentToContact;
    lead.consentRecordedAt = patch.consentToContact ? nowIso() : lead.consentRecordedAt;
  }
  if (patch.assignedUserId !== undefined) {
    if (patch.assignedUserId) {
      const allowed = candidates(db, actor.workspaceId).some(
        (candidate) =>
          candidate.userId === patch.assignedUserId &&
          candidate.active &&
          candidate.role !== "viewer",
      );
      if (!allowed) throw new CrmError("That agent cannot be assigned in this workspace.", 403);
    }
    lead.assignedUserId = patch.assignedUserId;
  }
  if (patch.status && patch.status !== lead.status) {
    lead.status = patch.status;
    const openDeal = db.deals.find(
      (deal) =>
        deal.leadId === lead.id &&
        deal.workspaceId === actor.workspaceId &&
        !deal.archivedAt &&
        deal.outcome === "open",
    );
    if (openDeal && openDeal.stage !== patch.status) {
      applyStage(openDeal, patch.status);
    }
  }
  if (patch.archived) lead.archivedAt = nowIso();
  const scored = scoreLead({
    email: lead.email,
    phone: lead.phone,
    budgetAmount: lead.budgetAmount,
    preferredLocation: lead.preferredLocation,
    propertyType: lead.propertyType,
    buyingTimelineDays: lead.buyingTimelineDays,
    consentToContact: lead.consentToContact,
  });
  lead.qualificationScore = scored.score;
  lead.scoreExplanation = scored.rules;
  lead.updatedAt = nowIso();
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "lead.updated",
    recordType: "lead",
    recordId: lead.id,
    metadata: {},
    beforeValue: before,
    afterValue: { status: lead.status, assignedUserId: lead.assignedUserId },
  });
  return lead;
}

function applyStage(deal: Deal, stage: PipelineStage) {
  deal.stage = stage;
  deal.outcome = outcomeForStage(stage);
  deal.probability = DEFAULT_STAGE_PROBABILITY[stage];
  deal.updatedAt = nowIso();
}

export function createProperty(
  db: Database,
  actor: Actor,
  input: Omit<Property, "id" | "workspaceId" | "archivedAt" | "createdBy" | "createdAt" | "updatedAt">,
): Property {
  assertWriter(actor);
  const timestamp = nowIso();
  const property: Property = {
    ...input,
    id: nid(),
    workspaceId: actor.workspaceId,
    title: input.title.trim(),
    priceCurrency: input.priceCurrency.toUpperCase(),
    archivedAt: null,
    createdBy: actor.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.properties.push(property);
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "property.created",
    recordType: "property",
    recordId: property.id,
    metadata: {},
    beforeValue: null,
    afterValue: { title: property.title, availability: property.availability },
  });
  return property;
}

export function updateProperty(
  db: Database,
  actor: Actor,
  propertyId: string,
  patch: Partial<Property> & { archived?: boolean },
): Property {
  assertWriter(actor);
  const property = db.properties.find(
    (item) => item.id === propertyId && item.workspaceId === actor.workspaceId,
  );
  if (!property) throw new CrmError("Property not found.", 404);
  const before = { availability: property.availability, priceAmount: property.priceAmount };
  Object.assign(property, {
    ...patch,
    id: property.id,
    workspaceId: property.workspaceId,
    archivedAt: patch.archived ? nowIso() : property.archivedAt,
    updatedAt: nowIso(),
  });
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "property.updated",
    recordType: "property",
    recordId: property.id,
    metadata: {},
    beforeValue: before,
    afterValue: { availability: property.availability, priceAmount: property.priceAmount },
  });
  return property;
}

export function addPropertyImage(
  db: Database,
  actor: Actor,
  input: { propertyId: string; storagePath: string; altText: string },
) {
  assertWriter(actor);
  const property = db.properties.find(
    (item) => item.id === input.propertyId && item.workspaceId === actor.workspaceId,
  );
  if (!property) throw new CrmError("Property not found.", 404);
  const image = {
    id: nid(),
    workspaceId: actor.workspaceId,
    propertyId: property.id,
    storagePath: input.storagePath,
    altText: input.altText,
    sortOrder: db.images.filter((item) => item.propertyId === property.id).length,
    createdAt: nowIso(),
  };
  db.images.push(image);
  return image;
}

export function createDeal(
  db: Database,
  actor: Actor,
  input: {
    leadId: string;
    propertyId?: string | null;
    title: string;
    expectedValue: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: string | null;
    stage?: PipelineStage;
    assignedUserId?: string | null;
  },
): Deal {
  assertWriter(actor);
  const lead = db.leads.find((item) => item.id === input.leadId && item.workspaceId === actor.workspaceId);
  if (!lead) throw new CrmError("Lead does not belong to this workspace.", 400);
  if (input.propertyId) {
    const property = db.properties.find(
      (item) => item.id === input.propertyId && item.workspaceId === actor.workspaceId,
    );
    if (!property) throw new CrmError("Property does not belong to this workspace.", 400);
  }
  const stage = input.stage ?? "new";
  const timestamp = nowIso();
  const deal: Deal = {
    id: nid(),
    workspaceId: actor.workspaceId,
    leadId: lead.id,
    propertyId: input.propertyId ?? null,
    assignedUserId: input.assignedUserId ?? lead.assignedUserId,
    title: input.title.trim(),
    stage,
    expectedValue: input.expectedValue,
    currency: (input.currency ?? lead.budgetCurrency).toUpperCase(),
    probability: input.probability ?? DEFAULT_STAGE_PROBABILITY[stage],
    expectedCloseDate: input.expectedCloseDate ?? null,
    outcome: outcomeForStage(stage),
    lostReason: null,
    archivedAt: null,
    createdBy: actor.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.deals.push(deal);
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "deal.created",
    recordType: "deal",
    recordId: deal.id,
    metadata: { leadId: lead.id },
    beforeValue: null,
    afterValue: { stage: deal.stage, expectedValue: deal.expectedValue },
  });
  return deal;
}

export function changeDealStage(
  db: Database,
  actor: Actor,
  dealId: string,
  stage: PipelineStage,
  lostReason?: string | null,
): Deal {
  assertWriter(actor);
  if (!PIPELINE_STAGES.includes(stage)) throw new CrmError("Unknown pipeline stage.", 400);
  const deal = db.deals.find((item) => item.id === dealId && item.workspaceId === actor.workspaceId);
  if (!deal) throw new CrmError("Deal not found.", 404);
  const before = { stage: deal.stage, outcome: deal.outcome };
  applyStage(deal, stage);
  deal.lostReason = stage === "lost" ? lostReason?.trim() || null : null;
  const lead = db.leads.find((item) => item.id === deal.leadId);
  if (lead && lead.status !== stage) {
    const previous = lead.status;
    lead.status = stage;
    lead.updatedAt = deal.updatedAt;
    addActivity(db, {
      workspaceId: actor.workspaceId,
      actorId: actor.userId,
      eventType: "lead.stage_changed",
      recordType: "lead",
      recordId: lead.id,
      metadata: { source: "deal" },
      beforeValue: { status: previous },
      afterValue: { status: stage },
    });
  }
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "deal.stage_changed",
    recordType: "deal",
    recordId: deal.id,
    metadata: {},
    beforeValue: before,
    afterValue: { stage: deal.stage, outcome: deal.outcome },
  });
  return deal;
}

export function createTask(
  db: Database,
  actor: Actor,
  input: {
    title: string;
    description?: string;
    priority: Task["priority"];
    dueAt?: string | null;
    assignedUserId?: string | null;
    leadId?: string | null;
    dealId?: string | null;
    propertyId?: string | null;
    idempotencyKey?: string | null;
  },
): Task {
  assertWriter(actor);
  if (input.idempotencyKey) {
    const existing = db.tasks.find(
      (task) => task.workspaceId === actor.workspaceId && task.idempotencyKey === input.idempotencyKey,
    );
    if (existing) return existing;
  }
  assertSameWorkspace(db, actor.workspaceId, input);
  const timestamp = nowIso();
  const task: Task = {
    id: nid(),
    workspaceId: actor.workspaceId,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    priority: input.priority,
    dueAt: input.dueAt ?? null,
    status: "pending",
    assignedUserId: input.assignedUserId ?? actor.userId,
    leadId: input.leadId ?? null,
    dealId: input.dealId ?? null,
    propertyId: input.propertyId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    completedAt: null,
    reminderSentAt: null,
    createdBy: actor.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.tasks.push(task);
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "task.created",
    recordType: "task",
    recordId: task.id,
    metadata: {},
    beforeValue: null,
    afterValue: { status: task.status, dueAt: task.dueAt },
  });
  return task;
}

function assertSameWorkspace(
  db: Database,
  workspaceId: string,
  links: { leadId?: string | null; dealId?: string | null; propertyId?: string | null },
) {
  if (links.leadId && !db.leads.some((item) => item.id === links.leadId && item.workspaceId === workspaceId)) {
    throw new CrmError("Lead does not belong to this workspace.", 400);
  }
  if (links.dealId && !db.deals.some((item) => item.id === links.dealId && item.workspaceId === workspaceId)) {
    throw new CrmError("Deal does not belong to this workspace.", 400);
  }
  if (
    links.propertyId &&
    !db.properties.some((item) => item.id === links.propertyId && item.workspaceId === workspaceId)
  ) {
    throw new CrmError("Property does not belong to this workspace.", 400);
  }
}

export function updateTask(
  db: Database,
  actor: Actor,
  taskId: string,
  patch: { status?: Task["status"]; dueAt?: string | null; assignedUserId?: string | null },
): Task {
  assertWriter(actor);
  const task = db.tasks.find((item) => item.id === taskId && item.workspaceId === actor.workspaceId);
  if (!task) throw new CrmError("Task not found.", 404);
  const before = { status: task.status, dueAt: task.dueAt };
  if (patch.status) {
    task.status = patch.status;
    task.completedAt = patch.status === "completed" ? nowIso() : null;
  }
  if (patch.dueAt !== undefined) {
    task.dueAt = patch.dueAt;
    task.reminderSentAt = null;
  }
  if (patch.assignedUserId !== undefined) task.assignedUserId = patch.assignedUserId;
  task.updatedAt = nowIso();
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "task.updated",
    recordType: "task",
    recordId: task.id,
    metadata: {},
    beforeValue: before,
    afterValue: { status: task.status, dueAt: task.dueAt },
  });
  return task;
}

export function createViewing(
  db: Database,
  actor: Actor,
  input: {
    leadId: string;
    propertyId: string;
    assignedUserId?: string | null;
    startsAt: string;
    endsAt: string;
    timezone: string;
    notes?: string;
  },
): Viewing {
  assertWriter(actor);
  const windowError = validateViewingWindow(input.startsAt, input.endsAt);
  if (windowError) throw new CrmError(windowError, 400);
  const lead = db.leads.find((item) => item.id === input.leadId && item.workspaceId === actor.workspaceId);
  const property = db.properties.find(
    (item) => item.id === input.propertyId && item.workspaceId === actor.workspaceId,
  );
  if (!lead || !property) {
    throw new CrmError("The lead and property must belong to this workspace.", 400);
  }
  const assignedUserId = input.assignedUserId ?? lead.assignedUserId ?? actor.userId;
  const conflict = findAgentConflict(db.viewings, {
    assignedUserId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: "scheduled",
  });
  if (conflict) {
    throw new CrmError("That agent already has a viewing during this time.", 409);
  }
  const timestamp = nowIso();
  const viewing: Viewing = {
    id: nid(),
    workspaceId: actor.workspaceId,
    leadId: lead.id,
    propertyId: property.id,
    assignedUserId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    status: "scheduled",
    notes: input.notes?.trim() ?? "",
    googleEventId: null,
    googleSyncStatus: "not_connected",
    reminderSentAt: null,
    createdBy: actor.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.viewings.push(viewing);
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "viewing.created",
    recordType: "viewing",
    recordId: viewing.id,
    metadata: { googleSyncStatus: "not_connected" },
    beforeValue: null,
    afterValue: { status: viewing.status, startsAt: viewing.startsAt },
  });
  return viewing;
}

export function updateViewing(
  db: Database,
  actor: Actor,
  viewingId: string,
  patch: { status?: Viewing["status"]; startsAt?: string; endsAt?: string; notes?: string },
): Viewing {
  assertWriter(actor);
  const viewing = db.viewings.find(
    (item) => item.id === viewingId && item.workspaceId === actor.workspaceId,
  );
  if (!viewing) throw new CrmError("Viewing not found.", 404);
  const nextStart = patch.startsAt ?? viewing.startsAt;
  const nextEnd = patch.endsAt ?? viewing.endsAt;
  const nextStatus = patch.status ?? viewing.status;
  const windowError = validateViewingWindow(nextStart, nextEnd);
  if (windowError) throw new CrmError(windowError, 400);
  const conflict = findAgentConflict(
    db.viewings.filter((item) => item.workspaceId === actor.workspaceId),
    {
      id: viewing.id,
      assignedUserId: viewing.assignedUserId,
      startsAt: nextStart,
      endsAt: nextEnd,
      status: nextStatus === "confirmed" || nextStatus === "scheduled" ? nextStatus : "cancelled",
    },
  );
  if (conflict) throw new CrmError("That agent already has a viewing during this time.", 409);
  const before = { status: viewing.status, startsAt: viewing.startsAt };
  viewing.startsAt = nextStart;
  viewing.endsAt = nextEnd;
  viewing.status = nextStatus;
  if (patch.notes !== undefined) viewing.notes = patch.notes;
  if (patch.startsAt || patch.endsAt) viewing.reminderSentAt = null;
  viewing.updatedAt = nowIso();
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "viewing.updated",
    recordType: "viewing",
    recordId: viewing.id,
    metadata: {},
    beforeValue: before,
    afterValue: { status: viewing.status, startsAt: viewing.startsAt },
  });
  return viewing;
}

export function createWorkspaceRecord(
  db: Database,
  userId: string,
  name: string,
  slug: string,
): Workspace {
  if (db.workspaces.some((workspace) => workspace.slug === slug)) {
    throw new CrmError("That workspace URL is already in use.", 409);
  }
  const timestamp = nowIso();
  const workspace: Workspace = {
    id: nid(),
    name: name.trim(),
    slug,
    currency: "USD",
    timezone: "America/New_York",
    assignmentStrategy: "round_robin",
    assignmentMemberId: null,
    lastRoundRobinUserId: null,
    followUpDueHours: 24,
    taskReminderHours: 2,
    viewingReminderHours: 24,
    intakeKeyHash: null,
    createdBy: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.workspaces.push(workspace);
  db.members.push({
    id: nid(),
    workspaceId: workspace.id,
    userId,
    role: "owner",
    active: true,
    roundRobinOrder: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  db.workflows.push(...defaultWorkflows(workspace.id, timestamp));
  for (const provider of ["resend", "n8n", "openai", "google_calendar"] as const) {
    db.connections.push({
      id: nid(),
      workspaceId: workspace.id,
      provider,
      status: "disconnected",
      accountReference: null,
      lastSyncedAt: null,
      lastError: null,
      metadata: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  return workspace;
}

export function updateWorkspaceSettings(
  db: Database,
  actor: Actor,
  patch: Partial<
    Pick<
      Workspace,
      | "name"
      | "currency"
      | "timezone"
      | "assignmentStrategy"
      | "assignmentMemberId"
      | "followUpDueHours"
      | "taskReminderHours"
      | "viewingReminderHours"
    >
  >,
): Workspace {
  assertAdmin(actor);
  const workspace = workspaceOf(db, actor.workspaceId);
  Object.assign(workspace, patch, { updatedAt: nowIso() });
  return workspace;
}

export function setMemberRole(
  db: Database,
  actor: Actor,
  memberId: string,
  role: Membership["role"],
): Membership {
  assertAdmin(actor);
  const member = db.members.find(
    (item) => item.id === memberId && item.workspaceId === actor.workspaceId,
  );
  if (!member) throw new CrmError("Member not found.", 404);
  if (role === "owner" && actor.role !== "owner") {
    throw new CrmError("Only an owner can grant the owner role.", 403);
  }
  if (member.role === "owner" && role !== "owner") {
    const owners = db.members.filter(
      (item) => item.workspaceId === actor.workspaceId && item.role === "owner" && item.active,
    );
    if (owners.length < 2) throw new CrmError("A workspace must keep one active owner.", 400);
  }
  member.role = role;
  member.updatedAt = nowIso();
  return member;
}

export function createInvitation(
  db: Database,
  actor: Actor,
  input: { email: string; role: Invitation["role"]; tokenHash: string; now?: Date },
): Invitation {
  assertAdmin(actor);
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) throw new CrmError("Enter a valid email address.", 400);
  const profile = db.profiles.find((item) => normalizeEmail(item.email) === email);
  if (profile && membershipFor(db, profile.id, actor.workspaceId)) {
    throw new CrmError("That person is already a member.", 409);
  }
  const pending = db.invitations.find(
    (item) => item.workspaceId === actor.workspaceId && item.email === email && !item.acceptedAt,
  );
  if (pending) throw new CrmError("An invitation is already pending for that email.", 409);
  const timestamp = (input.now ?? new Date()).toISOString();
  const invitation: Invitation = {
    id: nid(),
    workspaceId: actor.workspaceId,
    email,
    role: input.role,
    tokenHash: input.tokenHash,
    expiresAt: new Date((input.now ?? new Date()).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: null,
    invitedBy: actor.userId,
    createdAt: timestamp,
  };
  db.invitations.push(invitation);
  return invitation;
}

export function acceptInvitation(db: Database, userId: string, token: string, now = new Date()): Membership {
  const profile = db.profiles.find((item) => item.id === userId);
  if (!profile) throw new CrmError("Profile not found.", 404);
  const email = normalizeEmail(profile.email);
  if (!email) throw new CrmError("Add an email to your profile before accepting an invitation.", 400);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = db.invitations.find((item) => item.tokenHash === tokenHash && !item.acceptedAt);
  if (!invitation) throw new CrmError("Invitation was not found.", 404);
  if (new Date(invitation.expiresAt).getTime() < now.getTime()) {
    throw new CrmError("Invitation has expired.", 400);
  }
  if (invitation.email !== email) throw new CrmError("This invitation was sent to a different email.", 403);
  invitation.acceptedAt = now.toISOString();
  const existing = db.members.find(
    (member) => member.userId === userId && member.workspaceId === invitation.workspaceId,
  );
  if (existing) {
    existing.active = true;
    existing.role = invitation.role;
    existing.updatedAt = now.toISOString();
    return existing;
  }
  const member: Membership = {
    id: nid(),
    workspaceId: invitation.workspaceId,
    userId,
    role: invitation.role,
    active: true,
    roundRobinOrder: db.members.filter((item) => item.workspaceId === invitation.workspaceId).length,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.members.push(member);
  return member;
}

export function saveDraft(
  db: Database,
  actor: Actor,
  input: { leadId: string | null; subject: string; body: string; source: "agent" | "ai" },
): MessageDraft {
  assertWriter(actor);
  if (input.leadId) {
    const lead = db.leads.find((item) => item.id === input.leadId && item.workspaceId === actor.workspaceId);
    if (!lead) throw new CrmError("Lead not found.", 404);
  }
  const timestamp = nowIso();
  const draft: MessageDraft = {
    id: nid(),
    workspaceId: actor.workspaceId,
    leadId: input.leadId,
    createdBy: actor.userId,
    channel: "email",
    subject: input.subject.trim(),
    body: input.body.trim(),
    source: input.source,
    status: "draft",
    approvedBy: null,
    approvedAt: null,
    providerMessageId: null,
    errorDetail: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.drafts.push(draft);
  return draft;
}

export function approveDraft(db: Database, actor: Actor, draftId: string): MessageDraft {
  assertWriter(actor);
  const draft = db.drafts.find((item) => item.id === draftId && item.workspaceId === actor.workspaceId);
  if (!draft) throw new CrmError("Draft not found.", 404);
  draft.status = "approved";
  draft.approvedBy = actor.userId;
  draft.approvedAt = nowIso();
  draft.updatedAt = draft.approvedAt;
  return draft;
}

export function markDraftDelivery(
  db: Database,
  actor: Actor,
  draftId: string,
  result:
    | { status: "sent"; providerMessageId: string }
    | { status: "not_sent" | "failed"; errorDetail: string },
): MessageDraft {
  assertWriter(actor);
  const draft = db.drafts.find((item) => item.id === draftId && item.workspaceId === actor.workspaceId);
  if (!draft) throw new CrmError("Draft not found.", 404);
  if (draft.status !== "approved" && draft.status !== "failed") {
    throw new CrmError("Approve the message before sending it.", 400);
  }
  draft.status = result.status === "sent" ? "sent" : result.status;
  draft.updatedAt = nowIso();
  if (result.status === "sent") {
    draft.providerMessageId = result.providerMessageId;
    draft.errorDetail = null;
  } else {
    draft.errorDetail = result.errorDetail;
  }
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: result.status === "sent" ? "message.sent" : "message.not_sent",
    recordType: "message_draft",
    recordId: draft.id,
    metadata: { providerMessageId: draft.providerMessageId },
    beforeValue: null,
    afterValue: { status: draft.status },
  });
  return draft;
}

export function processReminders(db: Database, workspaceId: string, now = new Date()): {
  taskReminders: number;
  viewingReminders: number;
} {
  const workspace = workspaceOf(db, workspaceId);
  let taskReminders = 0;
  let viewingReminders = 0;
  const taskWindow = workspace.taskReminderHours * 60 * 60 * 1000;
  for (const task of db.tasks) {
    if (task.workspaceId !== workspaceId || !task.dueAt || task.reminderSentAt) continue;
    if (task.status !== "pending" && task.status !== "in_progress") continue;
    const due = new Date(task.dueAt).getTime();
    if (due - now.getTime() > taskWindow || due < now.getTime() - 24 * 60 * 60 * 1000) continue;
    if (!task.assignedUserId) continue;
    const created = addNotification(db, {
      workspaceId,
      recipientId: task.assignedUserId,
      channel: "in_app",
      title: "Follow-up due",
      body: `${task.title} is due ${task.dueAt}. Email was not sent because no email provider is configured.`,
      dedupeKey: `task-reminder:${task.id}:${task.dueAt}`,
      deliveryStatus: "not_configured",
      errorDetail: "Email provider is not configured.",
    });
    if (created) {
      task.reminderSentAt = now.toISOString();
      taskReminders += 1;
    }
  }
  const viewingWindow = workspace.viewingReminderHours * 60 * 60 * 1000;
  for (const viewing of db.viewings) {
    if (viewing.workspaceId !== workspaceId || viewing.reminderSentAt) continue;
    if (viewing.status !== "scheduled" && viewing.status !== "confirmed") continue;
    const start = new Date(viewing.startsAt).getTime();
    if (start < now.getTime() || start - now.getTime() > viewingWindow) continue;
    if (!viewing.assignedUserId) continue;
    const created = addNotification(db, {
      workspaceId,
      recipientId: viewing.assignedUserId,
      channel: "in_app",
      title: "Viewing reminder",
      body: `A viewing starts ${viewing.startsAt}. No calendar invitation was sent.`,
      dedupeKey: `viewing-reminder:${viewing.id}:${viewing.startsAt}`,
      deliveryStatus: "not_configured",
      errorDetail: "Email and calendar providers are not configured.",
    });
    if (created) {
      viewing.reminderSentAt = now.toISOString();
      viewingReminders += 1;
    }
  }
  if (taskReminders > 0) {
    recordRun(db, workspaceId, "follow_up_reminders", `task-reminders:${now.toISOString().slice(0, 13)}`, {
      count: taskReminders,
      email: "not_configured",
    });
  }
  if (viewingReminders > 0) {
    recordRun(db, workspaceId, "viewing_reminders", `viewing-reminders:${now.toISOString().slice(0, 13)}`, {
      count: viewingReminders,
      email: "not_configured",
      calendar: "not_connected",
    });
  }
  return { taskReminders, viewingReminders };
}

export function prepareSequenceDrafts(db: Database, actor: Actor, leadId: string): MessageDraft[] {
  assertWriter(actor);
  const lead = db.leads.find((item) => item.id === leadId && item.workspaceId === actor.workspaceId);
  if (!lead) throw new CrmError("Lead not found.", 404);
  if (!lead.consentToContact || !lead.preferEmail) {
    throw new CrmError("This lead has not consented to email follow-up.", 400);
  }
  const steps = [24, 72];
  const created: MessageDraft[] = [];
  for (const hours of steps) {
    const key = `sequence:${lead.id}:${hours}`;
    if (db.drafts.some((draft) => draft.workspaceId === actor.workspaceId && draft.body.includes(key))) {
      continue;
    }
    const draft = saveDraft(db, actor, {
      leadId: lead.id,
      source: "agent",
      subject: `Following up, ${lead.fullName.split(" ")[0]}`,
      body: `Hello ${lead.fullName},\n\nI am following up on your property inquiry. Reply if you would like to review options${lead.preferredLocation ? ` in ${lead.preferredLocation}` : ""}.\n\nThis draft requires approval before it can be sent.\n\n${key}`,
    });
    created.push(draft);
  }
  recordRun(db, actor.workspaceId, "follow_up_sequence", `sequence:${lead.id}`, {
    drafts: created.length,
    approval: "required",
    email: "not_sent",
  });
  return created;
}

export function dashboard(db: Database, workspaceId: string, userId: string, now = new Date()) {
  const workspace = workspaceOf(db, workspaceId);
  const leads = db.leads.filter((lead) => lead.workspaceId === workspaceId && !lead.archivedAt);
  const deals = db.deals.filter((deal) => deal.workspaceId === workspaceId);
  const viewings = db.viewings.filter((viewing) => viewing.workspaceId === workspaceId);
  const tasks = db.tasks.filter((task) => task.workspaceId === workspaceId);
  const range = monthRange(now, workspace.timezone);
  const upcoming = viewings.filter(
    (viewing) =>
      (viewing.status === "scheduled" || viewing.status === "confirmed") &&
      new Date(viewing.startsAt) > now,
  );
  const dueToday = tasks.filter((task) => {
    if (!task.dueAt || (task.status !== "pending" && task.status !== "in_progress")) return false;
    const due = new Date(task.dueAt);
    return due >= startOfDay(now) && due < endOfDay(now);
  });
  const overdue = overdueTasks(
    tasks.map((task) => ({
      status: task.status,
      dueAt: task.dueAt,
      completedAt: task.completedAt,
      assignedUserId: task.assignedUserId,
    })),
    now,
  );
  const runs = db.runs
    .filter((run) => run.workspaceId === workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    metrics: {
      totalLeads: leads.length,
      newLeadsThisMonth: countNewLeadsInRange(
        leads.map((lead) => ({
          id: lead.id,
          createdAt: lead.createdAt,
          status: lead.status,
          source: lead.source,
        })),
        range.start,
        range.end,
      ),
      qualifiedLeads: leads.filter((lead) => isQualifiedStatus(lead.status)).length,
      upcomingViewings: upcoming.length,
      overdueFollowUps: overdue.length,
      activeDeals: deals.filter((deal) => deal.outcome === "open" && !deal.archivedAt).length,
      pipelineValue: totalPipelineValue(deals),
      weightedPipelineValue: weightedPipelineValue(deals),
      closedWonValue: closedWonValue(deals),
      currency: workspace.currency,
      followUpCompletion: followUpCompletionRate(tasks),
      leadToViewing: leadToViewingRate(
        leads.map((lead) => ({
          id: lead.id,
          createdAt: lead.createdAt,
          status: lead.status,
          source: lead.source,
        })),
        viewings.map((viewing) => ({
          leadId: viewing.leadId,
          status: viewing.status,
          startsAt: viewing.startsAt,
        })),
      ),
      viewingToOffer: viewingToOfferRate(
        leads.map((lead) => ({
          id: lead.id,
          createdAt: lead.createdAt,
          status: lead.status,
          source: lead.source,
        })),
        viewings.map((viewing) => ({
          leadId: viewing.leadId,
          status: viewing.status,
          startsAt: viewing.startsAt,
        })),
      ),
    },
    leadSources: leadsBySource(
      leads.map((lead) => ({
        id: lead.id,
        createdAt: lead.createdAt,
        status: lead.status,
        source: lead.source,
      })),
    ),
    stageDistribution: Object.entries(dealsByStage(deals)).map(([stage, count]) => ({
      stage,
      count,
    })),
    leadsOverTime: bucketByWeek(leads.map((lead) => lead.createdAt), now),
    dealValueTrend: bucketValues(deals, now),
    recentLeads: [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    upcomingViewings: upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 5),
    tasksDueToday: dueToday,
    overdueFollowUps: tasks.filter((task) => {
      if (task.status !== "pending" && task.status !== "in_progress") return false;
      if (!task.dueAt) return false;
      return new Date(task.dueAt).getTime() < now.getTime();
    }),
    recentActivity: db.activities
      .filter((activity) => activity.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8),
    notifications: db.notifications
      .filter((item) => item.workspaceId === workspaceId && item.recipientId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8),
    automation: {
      enabled: db.workflows.filter((item) => item.workspaceId === workspaceId && item.enabled).length,
      failed: runs.filter((run) => run.status === "failed").length,
      lastRun: runs[0] ?? null,
    },
  };
}

function startOfDay(now: Date) {
  const copy = new Date(now);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(now: Date) {
  const copy = new Date(now);
  copy.setHours(24, 0, 0, 0);
  return copy;
}

function bucketByWeek(dates: string[], now: Date) {
  const buckets: { period: string; count: number }[] = [];
  for (let index = 7; index >= 0; index -= 1) {
    const start = new Date(now);
    start.setDate(start.getDate() - index * 7);
    const label = start.toISOString().slice(0, 10);
    buckets.push({ period: label, count: 0 });
  }
  for (const value of dates) {
    const time = new Date(value).getTime();
    const bucket = [...buckets].reverse().find((item) => new Date(item.period).getTime() <= time);
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

function bucketValues(deals: Deal[], now: Date) {
  return bucketByWeek(
    deals.filter((deal) => deal.outcome === "open").map((deal) => deal.createdAt),
    now,
  ).map((bucket) => ({
    period: bucket.period,
    value: deals
      .filter((deal) => deal.outcome === "open" && deal.createdAt.slice(0, 10) <= bucket.period)
      .reduce((sum, deal) => sum + deal.expectedValue, 0),
  }));
}

export function propertyMatches(db: Database, workspaceId: string, leadId: string) {
  const lead = db.leads.find((item) => item.id === leadId && item.workspaceId === workspaceId);
  if (!lead) throw new CrmError("Lead not found.", 404);
  return matchProperties(
    {
      budgetAmount: lead.budgetAmount,
      budgetCurrency: lead.budgetCurrency,
      preferredLocation: lead.preferredLocation,
      propertyType: lead.propertyType,
    },
    db.properties.filter((property) => property.workspaceId === workspaceId),
  );
}

export function duplicateContacts(db: Database, workspaceId: string) {
  const contacts = db.contacts.filter((contact) => contact.workspaceId === workspaceId && !contact.archivedAt);
  const groups: { key: string; contactIds: string[] }[] = [];
  const seen = new Map<string, string[]>();
  for (const contact of contacts) {
    for (const key of [contact.email ? `email:${contact.email}` : null, contact.phone ? `phone:${contact.phone}` : null]) {
      if (!key) continue;
      const list = seen.get(key) ?? [];
      list.push(contact.id);
      seen.set(key, list);
    }
  }
  for (const [key, contactIds] of seen) {
    if (contactIds.length > 1) groups.push({ key, contactIds });
  }
  return groups;
}

export function searchWorkspace(db: Database, workspaceId: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return { leads: [], contacts: [], properties: [] };
  return {
    leads: db.leads.filter(
      (lead) =>
        lead.workspaceId === workspaceId &&
        !lead.archivedAt &&
        `${lead.fullName} ${lead.email ?? ""} ${lead.phone ?? ""}`.toLowerCase().includes(needle),
    ),
    contacts: db.contacts.filter(
      (contact) =>
        contact.workspaceId === workspaceId &&
        !contact.archivedAt &&
        `${contact.fullName} ${contact.email ?? ""} ${contact.phone ?? ""}`.toLowerCase().includes(needle),
    ),
    properties: db.properties.filter(
      (property) =>
        property.workspaceId === workspaceId &&
        !property.archivedAt &&
        `${property.title} ${property.city} ${property.addressLine}`.toLowerCase().includes(needle),
    ),
  };
}

export function archiveContact(db: Database, actor: Actor, contactId: string): Contact {
  assertWriter(actor);
  const contact = db.contacts.find(
    (item) => item.id === contactId && item.workspaceId === actor.workspaceId,
  );
  if (!contact) throw new CrmError("Contact not found.", 404);
  const openLeads = db.leads.some(
    (lead) => lead.contactId === contact.id && !lead.archivedAt,
  );
  if (openLeads) {
    throw new CrmError("Archive or reassign open leads before archiving this contact.", 400);
  }
  contact.archivedAt = nowIso();
  contact.updatedAt = contact.archivedAt;
  return contact;
}

export function updateContact(
  db: Database,
  actor: Actor,
  contactId: string,
  patch: Partial<Pick<Contact, "fullName" | "email" | "phone" | "contactType" | "notes" | "consentEmail" | "consentSms">>,
): Contact {
  assertWriter(actor);
  const contact = db.contacts.find(
    (item) => item.id === contactId && item.workspaceId === actor.workspaceId,
  );
  if (!contact) throw new CrmError("Contact not found.", 404);
  if (patch.fullName) contact.fullName = patch.fullName.trim();
  if (patch.email !== undefined) contact.email = normalizeEmail(patch.email);
  if (patch.phone !== undefined) contact.phone = normalizePhone(patch.phone);
  if (patch.contactType) contact.contactType = patch.contactType;
  if (patch.notes !== undefined) contact.notes = patch.notes;
  if (patch.consentEmail !== undefined) contact.consentEmail = patch.consentEmail;
  if (patch.consentSms !== undefined) contact.consentSms = patch.consentSms;
  contact.updatedAt = nowIso();
  addActivity(db, {
    workspaceId: actor.workspaceId,
    actorId: actor.userId,
    eventType: "contact.updated",
    recordType: "contact",
    recordId: contact.id,
    metadata: {},
    beforeValue: null,
    afterValue: { fullName: contact.fullName },
  });
  return contact;
}
