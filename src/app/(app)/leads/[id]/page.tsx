import Link from "next/link";
import { notFound } from "next/navigation";

import { prepareSequenceAction, updateLeadAction } from "@/lib/actions/crm";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { requireActor, withCrm } from "@/lib/crm/session";
import { propertyMatches } from "@/lib/data/operations";
import { formatDateTime, formatMoney } from "@/lib/domain/money";
import { STAGE_LABELS } from "@/lib/domain/pipeline";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES } from "@/lib/domain/pipeline";

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const notice = (await searchParams).notice;
  const actor = await requireActor();
  const data = await withCrm((db) => {
    const lead = db.leads.find((item) => item.id === id && item.workspaceId === actor.workspaceId);
    if (!lead) return null;
    return {
      lead,
      tasks: db.tasks.filter((task) => task.leadId === lead.id),
      viewings: db.viewings.filter((viewing) => viewing.leadId === lead.id),
      deals: db.deals.filter((deal) => deal.leadId === lead.id),
      activities: db.activities.filter((activity) => activity.recordId === lead.id),
      drafts: db.drafts.filter((draft) => draft.leadId === lead.id),
      matches: propertyMatches(db, actor.workspaceId, lead.id).slice(0, 5),
      assignee: db.profiles.find((profile) => profile.id === lead.assignedUserId)?.fullName ?? "Unassigned",
    };
  });
  if (!data) notFound();
  const { lead } = data;

  return (
    <div>
      <PageHeader title={lead.fullName} description={`${STAGE_LABELS[lead.status]} · Score ${lead.qualificationScore} · ${data.assignee}`} />
      <Notice message={notice} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="text-sm font-semibold">Requirements</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Email</dt><dd>{lead.email ?? "Missing"}</dd></div>
            <div><dt className="text-muted-foreground">Phone</dt><dd>{lead.phone ?? "Missing"}</dd></div>
            <div><dt className="text-muted-foreground">Budget</dt><dd>{lead.budgetAmount ? formatMoney(lead.budgetAmount, lead.budgetCurrency) : "Missing"}</dd></div>
            <div><dt className="text-muted-foreground">Location</dt><dd>{lead.preferredLocation ?? "Missing"}</dd></div>
            <div><dt className="text-muted-foreground">Property type</dt><dd>{lead.propertyType ?? "Missing"}</dd></div>
            <div><dt className="text-muted-foreground">Timeline</dt><dd>{lead.buyingTimelineDays ? `${lead.buyingTimelineDays} days` : "Missing"}</dd></div>
            <div><dt className="text-muted-foreground">Consent</dt><dd>{lead.consentToContact ? "Recorded" : "Not recorded"}</dd></div>
          </dl>
          <h2 className="mt-6 text-sm font-semibold">Score explanation</h2>
          <ul className="mt-2 grid gap-1 text-sm">
            {lead.scoreExplanation.map((rule) => (
              <li key={rule.id}>{rule.label}: {rule.awarded}/{rule.points}. {rule.detail}</li>
            ))}
          </ul>
          {lead.notes ? <p className="mt-4 text-sm">{lead.notes}</p> : null}
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold">Change status</h2>
          <form
            className="mt-3 grid gap-2"
            action={async (formData) => {
              "use server";
              await updateLeadAction(id, { status: formData.get("status"), consentToContact: lead.consentToContact, fullName: lead.fullName, source: lead.source });
            }}
          >
            <select name="status" defaultValue={lead.status} className="h-9 rounded-md border border-border px-2 text-sm">
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary">Save status</Button>
          </form>
          <form action={prepareSequenceAction} className="mt-4">
            <input type="hidden" name="leadId" value={lead.id} />
            <Button type="submit" variant="secondary">Prepare follow-up drafts</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Drafts are not sent until an agent approves them.</p>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-sm font-semibold">Matching properties</h2>
          {data.matches.map((match) => (
            <div key={match.propertyId} className="mt-3 border-t border-border pt-3 text-sm">
              <Link href={`/properties/${match.propertyId}`} className="font-medium text-primary">{match.title}</Link>
              <p className="text-xs text-muted-foreground">{match.suitable ? "Meets the recorded filters." : "Partial match."}</p>
              <ul className="mt-1 list-disc pl-4">{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">{match.mismatches.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </div>
          ))}
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold">Tasks and viewings</h2>
          {data.tasks.map((task) => (
            <p key={task.id} className="mt-2 text-sm">{task.title} · {task.status}{task.dueAt ? ` · due ${formatDateTime(task.dueAt, actor.workspace.timezone)}` : ""}</p>
          ))}
          {data.viewings.map((viewing) => (
            <p key={viewing.id} className="mt-2 text-sm">{formatDateTime(viewing.startsAt, viewing.timezone)} · {viewing.status} · calendar {viewing.googleSyncStatus.replaceAll("_", " ")}</p>
          ))}
          <h2 className="mt-4 text-sm font-semibold">Deals</h2>
          {data.deals.map((deal) => (
            <p key={deal.id} className="mt-2 text-sm">{deal.title} · {STAGE_LABELS[deal.stage]} · {formatMoney(deal.expectedValue, deal.currency)}</p>
          ))}
          <h2 className="mt-4 text-sm font-semibold">Activity</h2>
          {data.activities.map((activity) => (
            <p key={activity.id} className="mt-2 text-sm">{activity.eventType} · {formatDateTime(activity.createdAt, actor.workspace.timezone)}</p>
          ))}
          <h2 className="mt-4 text-sm font-semibold">Messages</h2>
          {data.drafts.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No messages have been sent.</p> : null}
          {data.drafts.map((draft) => (
            <p key={draft.id} className="mt-2 text-sm">{draft.subject} · {draft.status}{draft.errorDetail ? ` · ${draft.errorDetail}` : ""}</p>
          ))}
        </Panel>
      </div>
    </div>
  );
}
