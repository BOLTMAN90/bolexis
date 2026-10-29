export type TimeRange = {
  id?: string;
  assignedUserId: string | null;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
};

const BLOCKING = new Set(["scheduled", "confirmed"]);

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function validateViewingWindow(startsAt: string, endsAt: string): string | null {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Enter a valid start and end time.";
  }
  if (end <= start) {
    return "The end time must be after the start time.";
  }
  return null;
}

export function findAgentConflict(
  existing: TimeRange[],
  candidate: TimeRange,
): TimeRange | null {
  if (!candidate.assignedUserId || !BLOCKING.has(candidate.status)) return null;
  const windowError = validateViewingWindow(candidate.startsAt, candidate.endsAt);
  if (windowError) return null;
  const start = new Date(candidate.startsAt);
  const end = new Date(candidate.endsAt);

  return (
    existing.find((viewing) => {
      if (viewing.id && viewing.id === candidate.id) return false;
      if (viewing.assignedUserId !== candidate.assignedUserId) return false;
      if (!BLOCKING.has(viewing.status)) return false;
      return rangesOverlap(start, end, new Date(viewing.startsAt), new Date(viewing.endsAt));
    }) ?? null
  );
}
