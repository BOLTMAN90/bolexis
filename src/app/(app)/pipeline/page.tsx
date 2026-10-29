import { createDealAction } from "@/lib/actions/crm";
import { PipelineBoard } from "@/components/pipeline/board";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { requireActor, withCrm } from "@/lib/crm/session";
import { closedWonValue, totalPipelineValue, weightedPipelineValue } from "@/lib/domain/pipeline";
import { formatMoney } from "@/lib/domain/money";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; agent?: string }>;
}) {
  const params = await searchParams;
  const actor = await requireActor();
  const data = await withCrm((db) => {
    const deals = db.deals.filter((deal) => deal.workspaceId === actor.workspaceId && !deal.archivedAt && (!params.agent || deal.assignedUserId === params.agent));
    return {
      deals,
      leads: db.leads.filter((lead) => lead.workspaceId === actor.workspaceId),
      properties: db.properties.filter((property) => property.workspaceId === actor.workspaceId),
      currency: actor.workspace.currency,
    };
  });
  return (
    <div>
      <PageHeader title="Pipeline" description="Drag a card or use the stage list. Active value excludes won and lost deals." />
      <Notice message={params.notice} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel><p className="text-xs text-muted-foreground">Active pipeline</p><p className="text-xl font-semibold">{formatMoney(totalPipelineValue(data.deals), data.currency)}</p></Panel>
        <Panel><p className="text-xs text-muted-foreground">Weighted pipeline</p><p className="text-xl font-semibold">{formatMoney(weightedPipelineValue(data.deals), data.currency)}</p></Panel>
        <Panel><p className="text-xs text-muted-foreground">Closed won</p><p className="text-xl font-semibold">{formatMoney(closedWonValue(data.deals), data.currency)}</p></Panel>
      </div>
      <PipelineBoard
        deals={data.deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          stage: deal.stage,
          expectedValue: deal.expectedValue,
          currency: deal.currency,
          probability: deal.probability,
          leadName: data.leads.find((lead) => lead.id === deal.leadId)?.fullName ?? "Lead",
        }))}
      />
      <Panel className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">Create a deal</h2>
        <form className="grid gap-3 md:grid-cols-2" action={async (formData) => { "use server"; await createDealAction(Object.fromEntries(formData)); }}>
          <Field label="Title"><Input name="title" required /></Field>
          <Field label="Expected value"><Input name="expectedValue" type="number" min="0" required /></Field>
          <Field label="Lead">
            <Select name="leadId" required>
              {data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.fullName}</option>)}
            </Select>
          </Field>
          <Field label="Property">
            <Select name="propertyId" defaultValue="">
              <option value="">None</option>
              {data.properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
            </Select>
          </Field>
          <Button type="submit">Create deal</Button>
        </form>
      </Panel>
    </div>
  );
}
