import { describe, expect, it } from "vitest";

import { assignLead } from "@/lib/domain/assignment";
import { escapeCsvCell, parseCsv, toCsv, validateLeadCsv } from "@/lib/domain/csv";
import { claimIdempotency, queueReminderOnce } from "@/lib/domain/idempotency";
import { scoreLead } from "@/lib/domain/lead-score";
import {
  followUpCompletionRate,
  leadToViewingRate,
  overdueTasks,
  ratio,
  viewingToOfferRate,
} from "@/lib/domain/metrics";
import { matchProperties } from "@/lib/domain/property-match";
import { closedWonValue, totalPipelineValue, weightedPipelineValue } from "@/lib/domain/pipeline";
import { findAgentConflict, validateViewingWindow } from "@/lib/domain/viewing-conflicts";
import { verifyWebhook, signWebhook } from "@/lib/domain/webhook";

const agents = [
  { userId: "a", role: "agent" as const, active: true, roundRobinOrder: 1 },
  { userId: "b", role: "agent" as const, active: true, roundRobinOrder: 2 },
  { userId: "v", role: "viewer" as const, active: true, roundRobinOrder: 0 },
  { userId: "gone", role: "agent" as const, active: false, roundRobinOrder: 3 },
];

describe("lead scoring", () => {
  it("awards every rule when the lead is complete and timely", () => {
    const result = scoreLead({
      email: "ada@example.com",
      phone: "555-0100",
      budgetAmount: 450000,
      preferredLocation: "Brooklyn",
      propertyType: "apartment",
      buyingTimelineDays: 30,
      consentToContact: true,
    });
    expect(result.score).toBe(100);
    expect(result.rules.every((rule) => rule.awarded === rule.points)).toBe(true);
  });

  it("explains missing fields and scores a later timeline at 10 points", () => {
    const result = scoreLead({
      email: "not-an-email",
      phone: null,
      budgetAmount: null,
      preferredLocation: "",
      propertyType: null,
      buyingTimelineDays: 120,
      consentToContact: false,
    });
    expect(result.score).toBe(10);
    expect(result.rules.find((rule) => rule.id === "email")?.detail).toMatch(/missing or invalid/i);
  });
});

describe("assignment", () => {
  it("returns no assignee when nobody is eligible", () => {
    const result = assignLead({
      strategy: "round_robin",
      candidates: [{ userId: "v", role: "viewer", active: true, roundRobinOrder: 0 }],
    });
    expect(result.assignedUserId).toBeNull();
  });

  it("rotates among active agents and skips viewers", () => {
    const first = assignLead({ strategy: "round_robin", candidates: agents, lastAssignedUserId: null });
    const second = assignLead({
      strategy: "round_robin",
      candidates: agents,
      lastAssignedUserId: first.assignedUserId,
    });
    expect(first.assignedUserId).toBe("a");
    expect(second.assignedUserId).toBe("b");
  });
});

describe("pipeline math", () => {
  const deals = [
    { stage: "qualified" as const, expectedValue: 100, probability: 40 },
    { stage: "won" as const, expectedValue: 80, probability: 100 },
    { stage: "lost" as const, expectedValue: 50, probability: 0 },
    { stage: "new" as const, expectedValue: 20, probability: 10, archived: true },
  ];

  it("sums active value, weighted value, and closed-won separately", () => {
    expect(totalPipelineValue(deals)).toBe(100);
    expect(weightedPipelineValue(deals)).toBe(40);
    expect(closedWonValue(deals)).toBe(80);
  });
});

describe("rates", () => {
  it("returns null when the denominator is zero", () => {
    expect(ratio(1, 0)).toBeNull();
    expect(leadToViewingRate([], [])).toBeNull();
    expect(viewingToOfferRate([], [])).toBeNull();
    expect(followUpCompletionRate([])).toBeNull();
  });

  it("counts a follow-up completed after the due time as incomplete", () => {
    const rate = followUpCompletionRate([
      {
        status: "completed",
        dueAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-02T00:00:00.000Z",
        assignedUserId: "a",
      },
    ]);
    expect(rate).toBe(0);
  });

  it("lists overdue open tasks", () => {
    const overdue = overdueTasks(
      [
        {
          status: "pending",
          dueAt: "2020-01-01T00:00:00.000Z",
          completedAt: null,
          assignedUserId: "a",
        },
      ],
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(overdue).toHaveLength(1);
  });
});

describe("viewings", () => {
  it("rejects an end time that is not after the start", () => {
    expect(validateViewingWindow("2026-05-01T15:00:00.000Z", "2026-05-01T15:00:00.000Z")).toBeTruthy();
  });

  it("detects an overlapping appointment for the same agent", () => {
    const conflict = findAgentConflict(
      [
        {
          id: "1",
          assignedUserId: "agent",
          startsAt: "2026-05-01T15:00:00.000Z",
          endsAt: "2026-05-01T16:00:00.000Z",
          status: "confirmed",
        },
      ],
      {
        assignedUserId: "agent",
        startsAt: "2026-05-01T15:30:00.000Z",
        endsAt: "2026-05-01T16:30:00.000Z",
        status: "scheduled",
      },
    );
    expect(conflict?.id).toBe("1");
  });
});

describe("property matching", () => {
  it("explains a suitable listing from recorded fields only", () => {
    const [match] = matchProperties(
      {
        budgetAmount: 500000,
        budgetCurrency: "USD",
        preferredLocation: "Brooklyn",
        propertyType: "apartment",
      },
      [
        {
          id: "p1",
          title: "Garden Court",
          propertyType: "apartment",
          listingType: "sale",
          priceAmount: 480000,
          priceCurrency: "USD",
          city: "Brooklyn",
          region: "NY",
          availability: "available",
        },
      ],
    );
    expect(match.suitable).toBe(true);
    expect(match.reasons.join(" ")).toMatch(/within the recorded budget/);
  });
});

describe("csv", () => {
  it("prefixes formula-like cells and round-trips quotes", () => {
    const csv = toCsv(["name", "notes"], [["=cmd", 'say "hi"']]);
    expect(csv.startsWith("name,notes")).toBe(true);
    expect(escapeCsvCell("=cmd")).toBe("'=cmd");
    expect(parseCsv(csv)[1][0]).toBe("'=cmd");
  });

  it("rejects an import without a name column", () => {
    const result = validateLeadCsv("email\nada@example.com");
    expect(result.issues[0]?.message).toMatch(/full_name/);
  });
});

describe("idempotency", () => {
  it("creates a record once for the same key", () => {
    const store = new Map<string, { id: number }>();
    const first = claimIdempotency(store, "lead-1", () => ({ id: 1 }));
    const second = claimIdempotency(store, "lead-1", () => ({ id: 2 }));
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.value.id).toBe(1);
  });

  it("does not queue a reminder twice", () => {
    const sent = new Set<string>();
    expect(queueReminderOnce(sent, "task:1").queued).toBe(true);
    expect(queueReminderOnce(sent, "task:1").queued).toBe(false);
  });
});

describe("webhooks", () => {
  const secret = "test-secret";
  const body = '{"ok":true}';
  const timestamp = "1700000000000";

  it("accepts a fresh matching signature", () => {
    const signature = signWebhook(secret, timestamp, body);
    expect(
      verifyWebhook({
        secret,
        timestamp,
        signature,
        rawBody: body,
        now: new Date(Number(timestamp)),
      }).ok,
    ).toBe(true);
  });

  it("rejects a stale timestamp and a bad signature", () => {
    const signature = signWebhook(secret, timestamp, body);
    expect(
      verifyWebhook({
        secret,
        timestamp,
        signature,
        rawBody: body,
        now: new Date(Number(timestamp) + 10 * 60 * 1000),
      }),
    ).toEqual({ ok: false, reason: "stale" });
    expect(
      verifyWebhook({
        secret,
        timestamp,
        signature: "deadbeef",
        rawBody: body,
        now: new Date(Number(timestamp)),
      }),
    ).toEqual({ ok: false, reason: "signature" });
  });
});
