export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "viewing_scheduled",
  "offer_submitted",
  "won",
  "lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const ACTIVE_STAGES: PipelineStage[] = [
  "new",
  "contacted",
  "qualified",
  "viewing_scheduled",
  "offer_submitted",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  viewing_scheduled: "Viewing Scheduled",
  offer_submitted: "Offer Submitted",
  won: "Won",
  lost: "Lost",
};

export const DEFAULT_STAGE_PROBABILITY: Record<PipelineStage, number> = {
  new: 10,
  contacted: 20,
  qualified: 40,
  viewing_scheduled: 60,
  offer_submitted: 75,
  won: 100,
  lost: 0,
};

export type DealMathInput = {
  stage: PipelineStage;
  expectedValue: number;
  probability: number;
  archived?: boolean;
};

export function isActiveDeal(deal: DealMathInput): boolean {
  return !deal.archived && ACTIVE_STAGES.includes(deal.stage);
}

export function totalPipelineValue(deals: DealMathInput[]): number {
  return roundMoney(
    deals.filter(isActiveDeal).reduce((sum, deal) => sum + nonNegative(deal.expectedValue), 0),
  );
}

export function weightedPipelineValue(deals: DealMathInput[]): number {
  return roundMoney(
    deals.filter(isActiveDeal).reduce((sum, deal) => {
      const probability = clamp(deal.probability, 0, 100);
      return sum + (nonNegative(deal.expectedValue) * probability) / 100;
    }, 0),
  );
}

export function closedWonValue(deals: DealMathInput[]): number {
  return roundMoney(
    deals
      .filter((deal) => !deal.archived && deal.stage === "won")
      .reduce((sum, deal) => sum + nonNegative(deal.expectedValue), 0),
  );
}

export function dealsByStage(deals: DealMathInput[]): Record<PipelineStage, number> {
  const counts = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, 0])) as Record<
    PipelineStage,
    number
  >;
  for (const deal of deals) {
    if (!deal.archived) counts[deal.stage] += 1;
  }
  return counts;
}

export function outcomeForStage(stage: PipelineStage): "open" | "won" | "lost" {
  if (stage === "won") return "won";
  if (stage === "lost") return "lost";
  return "open";
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
