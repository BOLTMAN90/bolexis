import { SimpleBarChart } from "@/components/charts/bar-chart";
import { PageHeader, Panel } from "@/components/shell/app-shell";
import { requireActor, withCrm } from "@/lib/crm/session";
import { dashboard } from "@/lib/data/operations";
import { SOURCE_LABELS, type LeadSource } from "@/lib/domain/labels";
import { percentLabel } from "@/lib/domain/metrics";
import { formatMoney } from "@/lib/domain/money";
import { STAGE_LABELS, type PipelineStage } from "@/lib/domain/pipeline";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; agent?: string }>;
}) {
  const params = await searchParams;
  const actor = await requireActor();
  const data = await withCrm((db) => {
    const snapshot = structuredClone(db);
    if (params.from) snapshot.leads = snapshot.leads.filter((lead) => lead.createdAt >= params.from!);
    if (params.to) snapshot.leads = snapshot.leads.filter((lead) => lead.createdAt < params.to!);
    if (params.agent) {
      snapshot.leads = snapshot.leads.filter((lead) => lead.assignedUserId === params.agent);
      snapshot.deals = snapshot.deals.filter((deal) => deal.assignedUserId === params.agent);
      snapshot.tasks = snapshot.tasks.filter((task) => task.assignedUserId === params.agent);
    }
    const report = dashboard(snapshot, actor.workspaceId, actor.userId);
    const agents = db.members
      .filter((member) => member.workspaceId === actor.workspaceId && member.active)
      .map((member) => ({
        id: member.userId,
        name: db.profiles.find((profile) => profile.id === member.userId)?.fullName ?? "Agent",
        tasks: db.tasks.filter((task) => task.assignedUserId === member.userId && task.workspaceId === actor.workspaceId).length,
        leads: db.leads.filter((lead) => lead.assignedUserId === member.userId && lead.workspaceId === actor.workspaceId).length,
      }));
    return { report, agents };
  });
  return (
    <div>
      <PageHeader title="Reports" description="Aggregated from workspace records. Export uses the same filters." />
      <form className="mb-4 flex flex-wrap gap-2">
        <input type="date" name="from" defaultValue={params.from} aria-label="From" className="h-9 rounded-md border border-border px-2 text-sm" />
        <input type="date" name="to" defaultValue={params.to} aria-label="To" className="h-9 rounded-md border border-border px-2 text-sm" />
        <select name="agent" defaultValue={params.agent ?? ""} aria-label="Agent" className="h-9 rounded-md border border-border px-2 text-sm">
          <option value="">All agents</option>
          {data.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select>
        <button className="rounded-md bg-primary px-3 text-sm text-white" type="submit">Apply</button>
        <a className="rounded-md border border-border bg-white px-3 py-2 text-sm" href={`/api/reports/export?from=${params.from ?? ""}&to=${params.to ?? ""}&agent=${params.agent ?? ""}`}>Export CSV</a>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-sm font-semibold">Lead volume by source</h2>
          <SimpleBarChart data={data.report.leadSources.map((item) => ({ source: SOURCE_LABELS[item.source as LeadSource] ?? item.source, count: item.count }))} xKey="source" yKey="count" />
        </Panel>
        <Panel>
          <h2 className="mb-3 text-sm font-semibold">Deal stages</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.report.stageDistribution.map((item) => (
                <tr key={item.stage} className="border-t border-border">
                  <td className="py-1">{STAGE_LABELS[item.stage as PipelineStage]}</td>
                  <td className="py-1 text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm">Pipeline {formatMoney(data.report.metrics.pipelineValue, data.report.metrics.currency)}</p>
          <p className="text-sm">Weighted {formatMoney(data.report.metrics.weightedPipelineValue, data.report.metrics.currency)}</p>
          <p className="text-sm">Won {formatMoney(data.report.metrics.closedWonValue, data.report.metrics.currency)}</p>
          <p className="text-sm">Lead to viewing {percentLabel(data.report.metrics.leadToViewing)}</p>
          <p className="text-sm">Viewing to offer {percentLabel(data.report.metrics.viewingToOffer)}</p>
          <p className="text-sm">Follow-up completion {percentLabel(data.report.metrics.followUpCompletion)}</p>
          <p className="text-sm">Overdue tasks {data.report.metrics.overdueFollowUps}</p>
        </Panel>
      </div>
      <Panel className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">Agent workload</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th>Agent</th><th>Leads</th><th>Tasks</th></tr></thead>
          <tbody>
            {data.agents.map((agent) => (
              <tr key={agent.id} className="border-t border-border"><td className="py-1">{agent.name}</td><td>{agent.leads}</td><td>{agent.tasks}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
