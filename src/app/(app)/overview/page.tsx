import Link from "next/link";

import { EmptyState, Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { SimpleBarChart } from "@/components/charts/bar-chart";
import { requireActor, withCrm } from "@/lib/crm/session";
import { dashboard } from "@/lib/data/operations";
import { SOURCE_LABELS, type LeadSource } from "@/lib/domain/labels";
import { formatMoney } from "@/lib/domain/money";
import { STAGE_LABELS, type PipelineStage } from "@/lib/domain/pipeline";
import { percentLabel } from "@/lib/domain/metrics";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  const actor = await requireActor();
  const data = await withCrm((db) => dashboard(db, actor.workspaceId, actor.userId));
  const cards = [
    ["Total leads", String(data.metrics.totalLeads)],
    ["New this month", String(data.metrics.newLeadsThisMonth)],
    ["Qualified leads", String(data.metrics.qualifiedLeads)],
    ["Upcoming viewings", String(data.metrics.upcomingViewings)],
    ["Overdue follow-ups", String(data.metrics.overdueFollowUps)],
    ["Active deals", String(data.metrics.activeDeals)],
    ["Pipeline value", formatMoney(data.metrics.pipelineValue, data.metrics.currency)],
    ["Weighted pipeline", formatMoney(data.metrics.weightedPipelineValue, data.metrics.currency)],
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Figures are calculated from this workspace. Empty values stay empty."
        action={
          <Link href="/leads/new" className="rounded-md bg-primary px-3 py-2 text-sm text-white">
            Add lead
          </Link>
        }
      />
      <Notice message={notice} />
      {data.metrics.totalLeads === 0 ? (
        <EmptyState title="No leads yet" body="Create a lead or send a website inquiry to the intake API." />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Panel key={label}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Panel>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-sm font-semibold">Leads over time</h2>
          <SimpleBarChart data={data.leadsOverTime} xKey="period" yKey="count" />
        </Panel>
        <Panel>
          <h2 className="mb-3 text-sm font-semibold">Lead sources</h2>
          <SimpleBarChart
            data={data.leadSources.map((item) => ({
              source: SOURCE_LABELS[item.source as LeadSource] ?? item.source,
              count: item.count,
            }))}
            xKey="source"
            yKey="count"
          />
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Lead sources</caption>
            <tbody>
              {data.leadSources.map((item) => (
                <tr key={item.source} className="border-t border-border">
                  <td className="py-1">{SOURCE_LABELS[item.source as LeadSource] ?? item.source}</td>
                  <td className="py-1 text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel>
          <h2 className="mb-3 text-sm font-semibold">Pipeline stages</h2>
          <SimpleBarChart
            data={data.stageDistribution.map((item) => ({
              stage: STAGE_LABELS[item.stage as PipelineStage],
              count: item.count,
            }))}
            xKey="stage"
            yKey="count"
          />
        </Panel>
        <Panel>
          <h2 className="mb-3 text-sm font-semibold">Conversion</h2>
          <p className="text-sm">Lead to viewing: {percentLabel(data.metrics.leadToViewing)}</p>
          <p className="mt-1 text-sm">Viewing to offer: {percentLabel(data.metrics.viewingToOffer)}</p>
          <p className="mt-1 text-sm">Follow-up completion: {percentLabel(data.metrics.followUpCompletion)}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Rates are null when the denominator is zero, which is shown as not enough data.
          </p>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel>
          <h2 className="mb-2 text-sm font-semibold">Recent leads</h2>
          {data.recentLeads.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : null}
          {data.recentLeads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="block border-t border-border py-2 text-sm">
              {lead.fullName}
              <span className="block text-xs text-muted-foreground">{STAGE_LABELS[lead.status]}</span>
            </Link>
          ))}
        </Panel>
        <Panel>
          <h2 className="mb-2 text-sm font-semibold">Upcoming viewings</h2>
          {data.upcomingViewings.length === 0 ? <p className="text-sm text-muted-foreground">None scheduled.</p> : null}
          {data.upcomingViewings.map((viewing) => (
            <p key={viewing.id} className="border-t border-border py-2 text-sm">
              {new Date(viewing.startsAt).toLocaleString()} · {viewing.status}
            </p>
          ))}
          <h2 className="mb-2 mt-4 text-sm font-semibold">Tasks due today</h2>
          {data.tasksDueToday.length === 0 ? <p className="text-sm text-muted-foreground">None due today.</p> : null}
          {data.tasksDueToday.map((task) => (
            <p key={task.id} className="border-t border-border py-2 text-sm">{task.title}</p>
          ))}
        </Panel>
        <Panel>
          <h2 className="mb-2 text-sm font-semibold">Overdue follow-ups</h2>
          {data.overdueFollowUps.length === 0 ? <p className="text-sm text-muted-foreground">None overdue.</p> : null}
          {data.overdueFollowUps.map((task) => (
            <p key={task.id} className="border-t border-border py-2 text-sm text-destructive">{task.title}</p>
          ))}
          <h2 className="mb-2 mt-4 text-sm font-semibold">Recent activity</h2>
          {data.recentActivity.map((activity) => (
            <p key={activity.id} className="border-t border-border py-2 text-sm">
              {activity.eventType.replaceAll(".", " ")}
              <span className="block text-xs text-muted-foreground">
                {String(activity.metadata.detail ?? activity.createdAt)}
              </span>
            </p>
          ))}
          <p className="mt-4 text-sm">
            Automations enabled: {data.automation.enabled}. Failed runs: {data.automation.failed}.
          </p>
        </Panel>
      </div>
    </div>
  );
}
