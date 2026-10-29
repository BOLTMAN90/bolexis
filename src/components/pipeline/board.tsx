"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";

import { changeDealStageAction } from "@/lib/actions/crm";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/lib/domain/pipeline";
import { formatMoney } from "@/lib/domain/money";

type Card = {
  id: string;
  title: string;
  stage: PipelineStage;
  expectedValue: number;
  currency: string;
  probability: number;
  leadName: string;
};

export function PipelineBoard({ deals }: { deals: Card[] }) {
  const [items, setItems] = useState(deals);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function move(dealId: string, stage: PipelineStage) {
    const previous = items;
    setItems((current) => current.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal)));
    const result = await changeDealStageAction(dealId, stage);
    if (result && "error" in result && result.error) {
      setItems(previous);
      setError(result.error);
    }
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <DndContext
        sensors={sensors}
        onDragEnd={(event) => {
          const stage = event.over?.id;
          if (!event.active.id || typeof stage !== "string") return;
          if (!PIPELINE_STAGES.includes(stage as PipelineStage)) return;
          void move(String(event.active.id), stage as PipelineStage);
        }}
      >
        <div className="grid gap-3 xl:grid-cols-7">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              deals={items.filter((deal) => deal.stage === stage)}
              onMove={move}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  onMove,
}: {
  stage: PipelineStage;
  deals: Card[];
  onMove: (id: string, stage: PipelineStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section ref={setNodeRef} className={`rounded-lg border bg-white p-2 ${isOver ? "border-primary" : "border-border"}`}>
      <h2 className="px-1 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {STAGE_LABELS[stage]} ({deals.length})
      </h2>
      <div className="grid gap-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onMove={onMove} />
        ))}
      </div>
    </section>
  );
}

function DealCard({ deal, onMove }: { deal: Card; onMove: (id: string, stage: PipelineStage) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  return (
    <article
      ref={setNodeRef}
      className="rounded-md border border-border bg-muted p-2 text-sm"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
    >
      <button type="button" className="w-full cursor-grab text-left" {...listeners} {...attributes}>
        <p className="font-medium">{deal.title}</p>
        <p className="text-xs text-muted-foreground">{deal.leadName}</p>
        <p className="mt-1 text-xs">
          {formatMoney(deal.expectedValue, deal.currency)} · {deal.probability}%
        </p>
      </button>
      <label className="mt-2 block text-xs text-muted-foreground">
        Move stage
        <select
          className="mt-1 h-8 w-full rounded-md border border-border bg-white px-1"
          value={deal.stage}
          onChange={(event) => onMove(deal.id, event.target.value as PipelineStage)}
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}
