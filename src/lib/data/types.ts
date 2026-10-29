import type { LeadScoreRule } from "@/lib/domain/lead-score";
import type { LeadSource, PropertyType } from "@/lib/domain/labels";
import type { PipelineStage } from "@/lib/domain/pipeline";
import type { WorkspaceRole } from "@/lib/domain/assignment";

export type AssignmentStrategy = "manual" | "round_robin" | "specific_agent";
export type PropertyCategory = "residential" | "commercial";
export type ListingType = "sale" | "rental";
export type Availability =
  | "available"
  | "under_offer"
  | "pending"
  | "leased"
  | "sold"
  | "off_market";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type ViewingStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type ContactType = "buyer" | "seller" | "tenant" | "landlord" | "investor" | "other";
export type DealOutcome = "open" | "won" | "lost";
export type MessageStatus = "draft" | "approved" | "sent" | "failed" | "not_sent";
export type IntegrationProvider = "resend" | "n8n" | "openai" | "google_calendar";
export type IntegrationConnectionStatus = "disconnected" | "connected" | "error";
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  timezone: string;
  locale: string;
  avatarPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  assignmentStrategy: AssignmentStrategy;
  assignmentMemberId: string | null;
  lastRoundRobinUserId: string | null;
  followUpDueHours: number;
  taskReminderHours: number;
  viewingReminderHours: number;
  intakeKeyHash: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Membership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  active: boolean;
  roundRobinOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Invitation = {
  id: string;
  workspaceId: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  tokenHash: string;
  expiresAt: string;
  acceptedAt: string | null;
  invitedBy: string | null;
  createdAt: string;
};

export type Contact = {
  id: string;
  workspaceId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  contactType: ContactType;
  notes: string;
  consentEmail: boolean;
  consentSms: boolean;
  consentRecordedAt: string | null;
  archivedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Lead = {
  id: string;
  workspaceId: string;
  contactId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: PipelineStage;
  assignedUserId: string | null;
  budgetAmount: number | null;
  budgetCurrency: string;
  preferredLocation: string | null;
  propertyType: PropertyType | null;
  buyingTimelineDays: number | null;
  notes: string;
  qualificationScore: number;
  scoreExplanation: LeadScoreRule[];
  preferEmail: boolean;
  preferPhone: boolean;
  preferSms: boolean;
  consentToContact: boolean;
  consentRecordedAt: string | null;
  idempotencyKey: string | null;
  archivedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Property = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  category: PropertyCategory;
  propertyType: PropertyType;
  listingType: ListingType;
  priceAmount: number;
  priceCurrency: string;
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaValue: number | null;
  areaUnit: "sqft" | "sqm";
  availability: Availability;
  assignedUserId: string | null;
  archivedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PropertyImage = {
  id: string;
  workspaceId: string;
  propertyId: string;
  storagePath: string;
  altText: string;
  sortOrder: number;
  createdAt: string;
};

export type Deal = {
  id: string;
  workspaceId: string;
  leadId: string;
  propertyId: string | null;
  assignedUserId: string | null;
  title: string;
  stage: PipelineStage;
  expectedValue: number;
  currency: string;
  probability: number;
  expectedCloseDate: string | null;
  outcome: DealOutcome;
  lostReason: string | null;
  archivedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueAt: string | null;
  status: TaskStatus;
  assignedUserId: string | null;
  leadId: string | null;
  dealId: string | null;
  propertyId: string | null;
  idempotencyKey: string | null;
  completedAt: string | null;
  reminderSentAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  workspaceId: string;
  actorId: string | null;
  eventType: string;
  recordType: string;
  recordId: string;
  metadata: Record<string, unknown>;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  createdAt: string;
};

export type Viewing = {
  id: string;
  workspaceId: string;
  leadId: string;
  propertyId: string;
  assignedUserId: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: ViewingStatus;
  notes: string;
  googleEventId: string | null;
  googleSyncStatus: "not_connected" | "pending" | "synced" | "error";
  reminderSentAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  workspaceId: string;
  recipientId: string;
  channel: "in_app" | "email";
  title: string;
  body: string;
  dedupeKey: string | null;
  readAt: string | null;
  deliveryStatus: "queued" | "sent" | "failed" | "skipped" | "not_configured";
  providerMessageId: string | null;
  errorDetail: string | null;
  createdAt: string;
};

export type Workflow = {
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  description: string;
  triggerType: "lead_created" | "task_due" | "viewing_upcoming" | "lead_unassigned" | "sequence_step";
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AutomationRun = {
  id: string;
  workspaceId: string;
  workflowId: string;
  status: RunStatus;
  correlationId: string;
  idempotencyKey: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorDetail: string | null;
  retryCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AutomationJob = {
  id: string;
  workspaceId: string;
  workflowId: string | null;
  runId: string | null;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  runAfter: string;
  lockedAt: string | null;
  lockedBy: string | null;
  attempts: number;
  maxAttempts: number;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationConnection = {
  id: string;
  workspaceId: string;
  provider: IntegrationProvider;
  status: IntegrationConnectionStatus;
  accountReference: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MessageDraft = {
  id: string;
  workspaceId: string;
  leadId: string | null;
  createdBy: string | null;
  channel: "email" | "sms";
  subject: string;
  body: string;
  source: "agent" | "ai";
  status: MessageStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  providerMessageId: string | null;
  errorDetail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Database = {
  profiles: Profile[];
  workspaces: Workspace[];
  members: Membership[];
  invitations: Invitation[];
  contacts: Contact[];
  leads: Lead[];
  properties: Property[];
  images: PropertyImage[];
  deals: Deal[];
  tasks: Task[];
  activities: Activity[];
  viewings: Viewing[];
  notifications: Notification[];
  workflows: Workflow[];
  runs: AutomationRun[];
  jobs: AutomationJob[];
  connections: IntegrationConnection[];
  drafts: MessageDraft[];
};

export type Actor = {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
};

export class CrmError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "CrmError";
  }
}
