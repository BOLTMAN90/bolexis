import { ACTIVE_STAGES, type PipelineStage } from "@/lib/domain/pipeline";

export function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

export function percentLabel(value: number | null): string {
  if (value === null) return "Not enough data";
  return `${Math.round(value * 1000) / 10}%`;
}

export type LeadMetricInput = {
  id: string;
  createdAt: string;
  status: PipelineStage;
  source: string;
  archived?: boolean;
};

export type ViewingMetricInput = {
  leadId: string;
  status: string;
  startsAt: string;
};

export type TaskMetricInput = {
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dueAt: string | null;
  completedAt: string | null;
  assignedUserId: string | null;
};

export function countNewLeadsInRange(
  leads: LeadMetricInput[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  return leads.filter((lead) => {
    if (lead.archived) return false;
    const created = new Date(lead.createdAt);
    return created >= rangeStart && created < rangeEnd;
  }).length;
}

export function isQualifiedStatus(status: PipelineStage): boolean {
  return (
    status === "qualified" ||
    status === "viewing_scheduled" ||
    status === "offer_submitted" ||
    status === "won"
  );
}

export function leadToViewingRate(
  leads: LeadMetricInput[],
  viewings: ViewingMetricInput[],
): number | null {
  const activeLeads = leads.filter((lead) => !lead.archived);
  const leadsWithViewing = new Set(viewings.map((viewing) => viewing.leadId));
  const numerator = activeLeads.filter((lead) => leadsWithViewing.has(lead.id)).length;
  return ratio(numerator, activeLeads.length);
}

export function viewingToOfferRate(
  leads: LeadMetricInput[],
  viewings: ViewingMetricInput[],
): number | null {
  const leadsWithViewing = new Set(viewings.map((viewing) => viewing.leadId));
  const numerator = leads.filter(
    (lead) =>
      !lead.archived &&
      leadsWithViewing.has(lead.id) &&
      (lead.status === "offer_submitted" || lead.status === "won"),
  ).length;
  return ratio(numerator, leadsWithViewing.size);
}

export function followUpCompletionRate(tasks: TaskMetricInput[], now = new Date()): number | null {
  const considered = tasks.filter((task) => task.status !== "cancelled" && task.dueAt);
  const completedOnTime = considered.filter((task) => {
    if (task.status !== "completed" || !task.completedAt || !task.dueAt) return false;
    return new Date(task.completedAt).getTime() <= new Date(task.dueAt).getTime();
  });
  void now;
  return ratio(completedOnTime.length, considered.length);
}

export function overdueTasks(tasks: TaskMetricInput[], now = new Date()): TaskMetricInput[] {
  return tasks.filter((task) => {
    if (task.status !== "pending" && task.status !== "in_progress") return false;
    if (!task.dueAt) return false;
    return new Date(task.dueAt).getTime() < now.getTime();
  });
}

export function leadsBySource(leads: LeadMetricInput[]): { source: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    if (lead.archived) continue;
    counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

export function isOpenStage(stage: PipelineStage): boolean {
  return ACTIVE_STAGES.includes(stage);
}
