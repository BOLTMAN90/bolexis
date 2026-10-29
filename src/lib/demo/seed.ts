import { defaultWorkflows } from "@/lib/data/operations";
import type { Database, Profile } from "@/lib/data/types";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

const ids = {
  workspace: DEMO_WORKSPACE_ID,
  maya: DEMO_USER_ID,
  andre: "00000000-0000-4000-8000-000000000003",
  priya: "00000000-0000-4000-8000-000000000004",
  luis: "00000000-0000-4000-8000-000000000005",
  contactElena: "00000000-0000-4000-8000-000000000011",
  contactJonah: "00000000-0000-4000-8000-000000000012",
  contactHelen: "00000000-0000-4000-8000-000000000013",
  contactMarcus: "00000000-0000-4000-8000-000000000014",
  contactSofia: "00000000-0000-4000-8000-000000000015",
  contactChris: "00000000-0000-4000-8000-000000000016",
  contactNina: "00000000-0000-4000-8000-000000000017",
  contactOwen: "00000000-0000-4000-8000-000000000018",
  leadElena: "00000000-0000-4000-8000-000000000021",
  leadJonah: "00000000-0000-4000-8000-000000000022",
  leadHelen: "00000000-0000-4000-8000-000000000023",
  leadMarcus: "00000000-0000-4000-8000-000000000024",
  leadSofia: "00000000-0000-4000-8000-000000000025",
  leadChris: "00000000-0000-4000-8000-000000000026",
  leadNina: "00000000-0000-4000-8000-000000000027",
  leadOwen: "00000000-0000-4000-8000-000000000028",
  propGarden: "00000000-0000-4000-8000-000000000031",
  propHarbor: "00000000-0000-4000-8000-000000000032",
  propMercer: "00000000-0000-4000-8000-000000000033",
  propWillow: "00000000-0000-4000-8000-000000000034",
  propRetail: "00000000-0000-4000-8000-000000000035",
  dealElena: "00000000-0000-4000-8000-000000000041",
  dealHelen: "00000000-0000-4000-8000-000000000042",
  dealChris: "00000000-0000-4000-8000-000000000043",
  dealNina: "00000000-0000-4000-8000-000000000044",
};

function shift(now: Date, days: number, hours = 10): string {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
}

function profile(id: string, fullName: string, email: string, now: string): Profile {
  return {
    id,
    fullName,
    email,
    phone: null,
    timezone: "America/New_York",
    locale: "en-US",
    avatarPath: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildSeed(now = new Date()): Database {
  const created = shift(now, -40, 9);
  const rules = (
    points: Array<[string, string, number, number, string]>,
  ) =>
    points.map(([id, label, max, awarded, detail]) => ({
      id,
      label,
      points: max,
      awarded,
      detail,
    }));

  const completeScore = rules([
    ["email", "Valid email", 10, 10, "A valid email is recorded."],
    ["phone", "Phone number", 10, 10, "A phone number is recorded."],
    ["budget", "Budget", 20, 20, "Budget is greater than zero."],
    ["location", "Preferred location", 15, 15, "A preferred location is recorded."],
    ["property_type", "Property type", 10, 10, "A property type is recorded."],
    ["timeline", "Buying timeline", 20, 20, "Timeline is within 90 days."],
    ["consent", "Consent to contact", 15, 15, "Consent to be contacted is recorded."],
  ]);

  return {
    profiles: [
      profile(ids.maya, "Maya Chen", "maya@northline.example", created),
      profile(ids.andre, "Andre Brooks", "andre@northline.example", created),
      profile(ids.priya, "Priya Shah", "priya@northline.example", created),
      profile(ids.luis, "Luis Ortega", "luis@northline.example", created),
    ],
    workspaces: [
      {
        id: ids.workspace,
        name: "Northline Realty",
        slug: "northline",
        currency: "USD",
        timezone: "America/New_York",
        assignmentStrategy: "round_robin",
        assignmentMemberId: null,
        lastRoundRobinUserId: ids.priya,
        followUpDueHours: 24,
        taskReminderHours: 2,
        viewingReminderHours: 24,
        intakeKeyHash: null,
        createdBy: ids.maya,
        createdAt: created,
        updatedAt: created,
      },
    ],
    members: [
      { id: "00000000-0000-4000-8000-000000000061", workspaceId: ids.workspace, userId: ids.maya, role: "owner", active: true, roundRobinOrder: 0, createdAt: created, updatedAt: created },
      { id: "00000000-0000-4000-8000-000000000062", workspaceId: ids.workspace, userId: ids.andre, role: "agent", active: true, roundRobinOrder: 1, createdAt: created, updatedAt: created },
      { id: "00000000-0000-4000-8000-000000000063", workspaceId: ids.workspace, userId: ids.priya, role: "agent", active: true, roundRobinOrder: 2, createdAt: created, updatedAt: created },
      { id: "00000000-0000-4000-8000-000000000064", workspaceId: ids.workspace, userId: ids.luis, role: "viewer", active: true, roundRobinOrder: 3, createdAt: created, updatedAt: created },
    ],
    invitations: [],
    contacts: [
      contact(ids.contactElena, "Elena Voss", "elena.voss@example.com", "+17185550101", "buyer", shift(now, -12)),
      contact(ids.contactJonah, "Jonah Adeyemi", "jonah.adeyemi@example.com", null, "buyer", shift(now, -2)),
      contact(ids.contactHelen, "Helen Cho", "helen.cho@example.com", "+17185550103", "buyer", shift(now, -20)),
      contact(ids.contactMarcus, "Marcus Hale", "marcus.hale@example.com", "+17185550104", "investor", shift(now, -6)),
      contact(ids.contactSofia, "Sofia Marin", "sofia.marin@example.com", "+17185550105", "buyer", shift(now, -30)),
      contact(ids.contactChris, "Chris Patel", "chris.patel@example.com", "+17185550106", "buyer", shift(now, -15)),
      contact(ids.contactNina, "Nina Kowalski", "nina.kowalski@example.com", "+17185550107", "buyer", shift(now, -35)),
      contact(ids.contactOwen, "Owen Blake", null, "+17185550108", "buyer", shift(now, -1)),
    ],
    leads: [
      lead({ id: ids.leadElena, contactId: ids.contactElena, fullName: "Elena Voss", email: "elena.voss@example.com", phone: "+17185550101", source: "website", status: "qualified", assignedUserId: ids.andre, budgetAmount: 650000, preferredLocation: "Brooklyn", propertyType: "apartment", buyingTimelineDays: 45, score: 100, rules: completeScore, consent: true, createdAt: shift(now, -12) }),
      lead({ id: ids.leadJonah, contactId: ids.contactJonah, fullName: "Jonah Adeyemi", email: "jonah.adeyemi@example.com", phone: null, source: "portal", status: "new", assignedUserId: ids.maya, budgetAmount: null, preferredLocation: "Jersey City", propertyType: "condo", buyingTimelineDays: null, score: 35, rules: rules([["email", "Valid email", 10, 10, "A valid email is recorded."], ["phone", "Phone number", 10, 0, "Phone number is missing."], ["budget", "Budget", 20, 0, "Budget is missing."], ["location", "Preferred location", 15, 15, "A preferred location is recorded."], ["property_type", "Property type", 10, 10, "A property type is recorded."], ["timeline", "Buying timeline", 20, 0, "Buying timeline is missing."], ["consent", "Consent to contact", 15, 0, "Consent to be contacted is not recorded."]]), consent: false, createdAt: shift(now, -2) }),
      lead({ id: ids.leadHelen, contactId: ids.contactHelen, fullName: "Helen Cho", email: "helen.cho@example.com", phone: "+17185550103", source: "referral", status: "viewing_scheduled", assignedUserId: ids.priya, budgetAmount: 900000, preferredLocation: "Jersey City", propertyType: "condo", buyingTimelineDays: 30, score: 100, rules: completeScore, consent: true, createdAt: shift(now, -20) }),
      lead({ id: ids.leadMarcus, contactId: ids.contactMarcus, fullName: "Marcus Hale", email: "marcus.hale@example.com", phone: "+17185550104", source: "phone", status: "contacted", assignedUserId: ids.andre, budgetAmount: 2000000, preferredLocation: "Jersey City", propertyType: "retail", buyingTimelineDays: 120, score: 90, rules: completeScore.map((rule) => rule.id === "timeline" ? { ...rule, awarded: 10, detail: "Timeline is set and is later than 90 days." } : rule), consent: true, createdAt: shift(now, -6) }),
      lead({ id: ids.leadSofia, contactId: ids.contactSofia, fullName: "Sofia Marin", email: "sofia.marin@example.com", phone: "+17185550105", source: "social", status: "lost", assignedUserId: ids.priya, budgetAmount: 500000, preferredLocation: "Brooklyn", propertyType: "apartment", buyingTimelineDays: 60, score: 100, rules: completeScore, consent: true, createdAt: shift(now, -30) }),
      lead({ id: ids.leadChris, contactId: ids.contactChris, fullName: "Chris Patel", email: "chris.patel@example.com", phone: "+17185550106", source: "walk_in", status: "offer_submitted", assignedUserId: ids.maya, budgetAmount: 1300000, preferredLocation: "Brooklyn", propertyType: "house", buyingTimelineDays: 21, score: 100, rules: completeScore, consent: true, createdAt: shift(now, -15) }),
      lead({ id: ids.leadNina, contactId: ids.contactNina, fullName: "Nina Kowalski", email: "nina.kowalski@example.com", phone: "+17185550107", source: "website", status: "won", assignedUserId: ids.andre, budgetAmount: 700000, preferredLocation: "Brooklyn", propertyType: "apartment", buyingTimelineDays: 14, score: 100, rules: completeScore, consent: true, createdAt: shift(now, -35) }),
      lead({ id: ids.leadOwen, contactId: ids.contactOwen, fullName: "Owen Blake", email: null, phone: "+17185550108", source: "other", status: "new", assignedUserId: null, budgetAmount: null, preferredLocation: null, propertyType: null, buyingTimelineDays: null, score: 10, rules: rules([["email", "Valid email", 10, 0, "Email is missing or invalid."], ["phone", "Phone number", 10, 10, "A phone number is recorded."], ["budget", "Budget", 20, 0, "Budget is missing."], ["location", "Preferred location", 15, 0, "Preferred location is missing."], ["property_type", "Property type", 10, 0, "Property type is missing."], ["timeline", "Buying timeline", 20, 0, "Buying timeline is missing."], ["consent", "Consent to contact", 15, 0, "Consent to be contacted is not recorded."]]), consent: false, createdAt: shift(now, -1) }),
    ],
    properties: [
      property({ id: ids.propGarden, title: "18 Garden Court", category: "residential", propertyType: "apartment", listingType: "sale", priceAmount: 640000, city: "Brooklyn", bedrooms: 2, bathrooms: 2, area: 980, availability: "available", agent: ids.andre, createdAt: shift(now, -50) }),
      property({ id: ids.propHarbor, title: "402 Harbor Lofts", category: "residential", propertyType: "condo", listingType: "sale", priceAmount: 875000, city: "Jersey City", bedrooms: 2, bathrooms: 2, area: 1100, availability: "available", agent: ids.priya, createdAt: shift(now, -48) }),
      property({ id: ids.propMercer, title: "9 Mercer Office", category: "commercial", propertyType: "office", listingType: "rental", priceAmount: 7200, city: "Brooklyn", bedrooms: null, bathrooms: 2, area: 2400, availability: "available", agent: ids.maya, createdAt: shift(now, -44) }),
      property({ id: ids.propWillow, title: "55 Willow House", category: "residential", propertyType: "house", listingType: "sale", priceAmount: 1250000, city: "Brooklyn", bedrooms: 4, bathrooms: 3, area: 2200, availability: "under_offer", agent: ids.maya, createdAt: shift(now, -40) }),
      property({ id: ids.propRetail, title: "210 Retail Row", category: "commercial", propertyType: "retail", listingType: "sale", priceAmount: 2100000, city: "Jersey City", bedrooms: null, bathrooms: 2, area: 3800, availability: "available", agent: ids.andre, createdAt: shift(now, -33) }),
    ],
    images: [],
    deals: [
      deal(ids.dealElena, ids.leadElena, ids.propGarden, ids.andre, "Voss — Garden Court", "qualified", 640000, 40, shift(now, 30).slice(0, 10), shift(now, -8)),
      deal(ids.dealHelen, ids.leadHelen, ids.propHarbor, ids.priya, "Cho — Harbor Lofts", "viewing_scheduled", 875000, 60, shift(now, 20).slice(0, 10), shift(now, -10)),
      deal(ids.dealChris, ids.leadChris, ids.propWillow, ids.maya, "Patel — Willow House", "offer_submitted", 1250000, 75, shift(now, 14).slice(0, 10), shift(now, -4)),
      deal(ids.dealNina, ids.leadNina, ids.propGarden, ids.andre, "Kowalski — Garden Court", "won", 690000, 100, shift(now, -5).slice(0, 10), shift(now, -18)),
    ],
    tasks: [
      task("00000000-0000-4000-8000-000000000071", "Follow up with Elena Voss", ids.andre, ids.leadElena, null, shift(now, 0, 15), "pending", shift(now, -11)),
      task("00000000-0000-4000-8000-000000000072", "Call Jonah Adeyemi for budget", ids.maya, ids.leadJonah, null, shift(now, -1, 11), "pending", shift(now, -2)),
      task("00000000-0000-4000-8000-000000000073", "Confirm Helen Cho viewing", ids.priya, ids.leadHelen, ids.propHarbor, shift(now, 1, 9), "in_progress", shift(now, -3)),
      task("00000000-0000-4000-8000-000000000074", "Send Chris Patel offer checklist", ids.maya, ids.leadChris, ids.propWillow, shift(now, -3, 16), "completed", shift(now, -5), shift(now, -4)),
    ],
    activities: [
      activity("lead.created", "lead", ids.leadOwen, ids.maya, "Lead saved from a manual inquiry.", shift(now, -1)),
      activity("lead.stage_changed", "lead", ids.leadElena, ids.andre, "Status moved to qualified after a requirements call.", shift(now, -9)),
      activity("viewing.created", "viewing", "00000000-0000-4000-8000-000000000081", ids.priya, "Viewing booked. Calendar sync is not connected.", shift(now, -3)),
      activity("deal.stage_changed", "deal", ids.dealChris, ids.maya, "Offer submitted on Willow House.", shift(now, -4)),
      activity("message.not_sent", "lead", ids.leadJonah, ids.maya, "Email was not sent. No email provider is configured.", shift(now, -1, 12)),
    ],
    viewings: [
      viewing("00000000-0000-4000-8000-000000000081", ids.leadHelen, ids.propHarbor, ids.priya, shift(now, 2, 15), shift(now, 2, 16), "confirmed"),
      viewing("00000000-0000-4000-8000-000000000082", ids.leadElena, ids.propGarden, ids.andre, shift(now, 4, 11), shift(now, 4, 12), "scheduled"),
      viewing("00000000-0000-4000-8000-000000000083", ids.leadNina, ids.propGarden, ids.andre, shift(now, -20, 13), shift(now, -20, 14), "completed"),
    ],
    notifications: [
      {
        id: "00000000-0000-4000-8000-000000000091",
        workspaceId: ids.workspace,
        recipientId: ids.maya,
        channel: "in_app",
        title: "New lead assigned",
        body: "Jonah Adeyemi was assigned to you. This is fictional demo data.",
        dedupeKey: `lead-assigned:${ids.leadJonah}`,
        readAt: null,
        deliveryStatus: "queued",
        providerMessageId: null,
        errorDetail: null,
        createdAt: shift(now, -2, 11),
      },
    ],
    workflows: defaultWorkflows(ids.workspace, created),
    runs: [
      {
        id: "00000000-0000-4000-8000-000000000101",
        workspaceId: ids.workspace,
        workflowId: "",
        status: "succeeded",
        correlationId: "00000000-0000-4000-8000-000000000111",
        idempotencyKey: "seed-intake-elena",
        startedAt: shift(now, -12, 10),
        finishedAt: shift(now, -12, 10),
        errorDetail: null,
        retryCount: 0,
        metadata: { externalEmail: "not_configured", externalWorkflow: "not_configured", note: "In-app intake only. No email was sent." },
        createdAt: shift(now, -12, 10),
      },
    ],
    jobs: [],
    connections: (["resend", "n8n", "openai", "google_calendar"] as const).map((provider, index) => ({
      id: `00000000-0000-4000-8000-00000000020${index}`,
      workspaceId: ids.workspace,
      provider,
      status: "disconnected" as const,
      accountReference: null,
      lastSyncedAt: null,
      lastError: null,
      metadata: {},
      createdAt: created,
      updatedAt: created,
    })),
    drafts: [
      {
        id: "00000000-0000-4000-8000-000000000121",
        workspaceId: ids.workspace,
        leadId: ids.leadElena,
        createdBy: ids.andre,
        channel: "email",
        subject: "Garden Court options",
        body: "Elena, I can walk you through 18 Garden Court. This draft has not been sent.",
        source: "agent",
        status: "draft",
        approvedBy: null,
        approvedAt: null,
        providerMessageId: null,
        errorDetail: null,
        createdAt: shift(now, -1, 14),
        updatedAt: shift(now, -1, 14),
      },
    ],
  };
}

function contact(
  id: string,
  fullName: string,
  email: string | null,
  phone: string | null,
  contactType: Database["contacts"][number]["contactType"],
  createdAt: string,
) {
  return {
    id,
    workspaceId: ids.workspace,
    fullName,
    email,
    phone,
    contactType,
    notes: "",
    consentEmail: Boolean(email),
    consentSms: false,
    consentRecordedAt: email ? createdAt : null,
    archivedAt: null,
    createdBy: ids.maya,
    createdAt,
    updatedAt: createdAt,
  };
}

function lead(input: {
  id: string;
  contactId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: Database["leads"][number]["source"];
  status: Database["leads"][number]["status"];
  assignedUserId: string | null;
  budgetAmount: number | null;
  preferredLocation: string | null;
  propertyType: Database["leads"][number]["propertyType"];
  buyingTimelineDays: number | null;
  score: number;
  rules: Database["leads"][number]["scoreExplanation"];
  consent: boolean;
  createdAt: string;
}): Database["leads"][number] {
  return {
    id: input.id,
    workspaceId: ids.workspace,
    contactId: input.contactId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    source: input.source,
    status: input.status,
    assignedUserId: input.assignedUserId,
    budgetAmount: input.budgetAmount,
    budgetCurrency: "USD",
    preferredLocation: input.preferredLocation,
    propertyType: input.propertyType,
    buyingTimelineDays: input.buyingTimelineDays,
    notes: "",
    qualificationScore: input.score,
    scoreExplanation: input.rules,
    preferEmail: Boolean(input.email),
    preferPhone: Boolean(input.phone),
    preferSms: false,
    consentToContact: input.consent,
    consentRecordedAt: input.consent ? input.createdAt : null,
    idempotencyKey: null,
    archivedAt: null,
    createdBy: ids.maya,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

function property(input: {
  id: string;
  title: string;
  category: "residential" | "commercial";
  propertyType: Database["properties"][number]["propertyType"];
  listingType: "sale" | "rental";
  priceAmount: number;
  city: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number;
  availability: Database["properties"][number]["availability"];
  agent: string;
  createdAt: string;
}): Database["properties"][number] {
  return {
    id: input.id,
    workspaceId: ids.workspace,
    title: input.title,
    description: `${input.title} is a fictional ${input.propertyType.replaceAll("_", " ")} listing used in the Northline Realty demo.`,
    category: input.category,
    propertyType: input.propertyType,
    listingType: input.listingType,
    priceAmount: input.priceAmount,
    priceCurrency: "USD",
    addressLine: input.title,
    city: input.city,
    region: input.city === "Brooklyn" ? "NY" : "NJ",
    postalCode: input.city === "Brooklyn" ? "11201" : "07302",
    country: "US",
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    areaValue: input.area,
    areaUnit: "sqft",
    availability: input.availability,
    assignedUserId: input.agent,
    archivedAt: null,
    createdBy: ids.maya,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

function deal(
  id: string,
  leadId: string,
  propertyId: string,
  agent: string,
  title: string,
  stage: Database["deals"][number]["stage"],
  value: number,
  probability: number,
  closeDate: string,
  createdAt: string,
): Database["deals"][number] {
  return {
    id,
    workspaceId: ids.workspace,
    leadId,
    propertyId,
    assignedUserId: agent,
    title,
    stage,
    expectedValue: value,
    currency: "USD",
    probability,
    expectedCloseDate: closeDate,
    outcome: stage === "won" ? "won" : stage === "lost" ? "lost" : "open",
    lostReason: null,
    archivedAt: null,
    createdBy: agent,
    createdAt,
    updatedAt: createdAt,
  };
}

function task(
  id: string,
  title: string,
  agent: string,
  leadId: string,
  propertyId: string | null,
  dueAt: string,
  status: Database["tasks"][number]["status"],
  createdAt: string,
  completedAt: string | null = null,
): Database["tasks"][number] {
  return {
    id,
    workspaceId: ids.workspace,
    title,
    description: "",
    priority: status === "pending" && dueAt < new Date().toISOString() ? "high" : "medium",
    dueAt,
    status,
    assignedUserId: agent,
    leadId,
    dealId: null,
    propertyId,
    idempotencyKey: null,
    completedAt,
    reminderSentAt: null,
    createdBy: ids.maya,
    createdAt,
    updatedAt: createdAt,
  };
}

function activity(
  eventType: string,
  recordType: string,
  recordId: string,
  actorId: string,
  detail: string,
  createdAt: string,
): Database["activities"][number] {
  return {
    id: crypto.randomUUID(),
    workspaceId: ids.workspace,
    actorId,
    eventType,
    recordType,
    recordId,
    metadata: { detail },
    beforeValue: null,
    afterValue: null,
    createdAt,
  };
}

function viewing(
  id: string,
  leadId: string,
  propertyId: string,
  agent: string,
  startsAt: string,
  endsAt: string,
  status: Database["viewings"][number]["status"],
): Database["viewings"][number] {
  return {
    id,
    workspaceId: ids.workspace,
    leadId,
    propertyId,
    assignedUserId: agent,
    startsAt,
    endsAt,
    timezone: "America/New_York",
    status,
    notes: "",
    googleEventId: null,
    googleSyncStatus: "not_connected",
    reminderSentAt: null,
    createdBy: agent,
    createdAt: startsAt,
    updatedAt: startsAt,
  };
}

export function attachWorkflowIds(db: Database) {
  const intake = db.workflows.find((workflow) => workflow.key === "new_lead_intake");
  if (intake && db.runs[0]) db.runs[0].workflowId = intake.id;
}
