import Link from "next/link";

import { importLeadsAction } from "@/lib/actions/crm";
import { Notice, PageHeader } from "@/components/shell/app-shell";
import { requireActor, withCrm } from "@/lib/crm/session";
import { SOURCE_LABELS } from "@/lib/domain/labels";
import { STAGE_LABELS } from "@/lib/domain/pipeline";
import { formatMoney } from "@/lib/domain/money";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const actor = await requireActor();
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = 20;
  const result = await withCrm((db) => {
    const query = (params.q ?? "").trim().toLowerCase();
    let leads = db.leads.filter((lead) => lead.workspaceId === actor.workspaceId && !lead.archivedAt);
    if (query) {
      leads = leads.filter((lead) =>
        `${lead.fullName} ${lead.email ?? ""} ${lead.phone ?? ""}`.toLowerCase().includes(query),
      );
    }
    if (params.status) leads = leads.filter((lead) => lead.status === params.status);
    if (params.source) leads = leads.filter((lead) => lead.source === params.source);
    if (params.agent) leads = leads.filter((lead) => lead.assignedUserId === params.agent);
    if (params.budgetMin) leads = leads.filter((lead) => (lead.budgetAmount ?? 0) >= Number(params.budgetMin));
    if (params.from) leads = leads.filter((lead) => lead.createdAt >= params.from!);
    leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      total: leads.length,
      leads: leads.slice((page - 1) * pageSize, page * pageSize),
      agents: db.profiles.filter((profile) =>
        db.members.some((member) => member.workspaceId === actor.workspaceId && member.userId === profile.id),
      ),
    };
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Search, filter, import, and open an inquiry."
        action={
          <Link href="/leads/new" className="rounded-md bg-primary px-3 py-2 text-sm text-white">
            New lead
          </Link>
        }
      />
      <Notice message={params.notice} />
      <form className="mb-4 grid gap-2 rounded-lg border border-border bg-white p-3 md:grid-cols-5">
        <input name="q" defaultValue={params.q} placeholder="Name, email, or phone" className="h-9 rounded-md border border-border px-2 text-sm" aria-label="Search leads" />
        <input name="status" defaultValue={params.status} placeholder="Status" className="h-9 rounded-md border border-border px-2 text-sm" aria-label="Status" />
        <input name="source" defaultValue={params.source} placeholder="Source" className="h-9 rounded-md border border-border px-2 text-sm" aria-label="Source" />
        <input name="budgetMin" defaultValue={params.budgetMin} placeholder="Minimum budget" className="h-9 rounded-md border border-border px-2 text-sm" aria-label="Minimum budget" />
        <button className="h-9 rounded-md bg-primary text-sm text-white" type="submit">Apply</button>
      </form>
      <form action={importLeadsAction} className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="csv">Import CSV</label>
        <input id="csv" name="file" type="file" accept=".csv,text/csv" required />
        <button className="rounded-md border border-border bg-white px-3 py-1.5" type="submit">Import</button>
        <a className="text-primary" href="/api/leads/export">Export CSV</a>
      </form>
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Budget</th>
              <th className="px-3 py-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {result.leads.map((lead) => (
              <tr key={lead.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-primary">{lead.fullName}</Link>
                  <span className="block text-xs text-muted-foreground">{lead.email || lead.phone || "No contact channel"}</span>
                </td>
                <td className="px-3 py-2">{STAGE_LABELS[lead.status]}</td>
                <td className="px-3 py-2">{SOURCE_LABELS[lead.source]}</td>
                <td className="px-3 py-2">{lead.budgetAmount ? formatMoney(lead.budgetAmount, lead.budgetCurrency) : "—"}</td>
                <td className="px-3 py-2">{lead.qualificationScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.total === 0 ? <p className="p-6 text-sm text-muted-foreground">No leads match these filters.</p> : null}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Showing {(page - 1) * pageSize + (result.leads.length ? 1 : 0)}–{(page - 1) * pageSize + result.leads.length} of {result.total}
      </p>
    </div>
  );
}
