import { createViewingAction, updateViewingAction } from "@/lib/actions/crm";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { requireActor, withCrm } from "@/lib/crm/session";
import { formatDateTime } from "@/lib/domain/money";

export default async function ViewingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; view?: string; month?: string }>;
}) {
  const params = await searchParams;
  const actor = await requireActor();
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const data = await withCrm((db) => ({
    viewings: db.viewings.filter((viewing) => viewing.workspaceId === actor.workspaceId && viewing.startsAt.slice(0, 7) === month),
    leads: db.leads.filter((lead) => lead.workspaceId === actor.workspaceId && !lead.archivedAt),
    properties: db.properties.filter((property) => property.workspaceId === actor.workspaceId && !property.archivedAt),
  }));
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Array.from({ length: days }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    const key = `${month}-${day}`;
    return { key, label: index + 1, count: data.viewings.filter((viewing) => viewing.startsAt.slice(0, 10) === key).length };
  });
  return (
    <div>
      <PageHeader title="Viewings calendar" description="Appointments stay in BOLEXIS until Google Calendar sync succeeds." />
      <Notice message={params.notice} />
      <div className="mb-4 flex gap-2 text-sm">
        <a className="rounded-md border border-border bg-white px-3 py-1.5" href={`/viewings?month=${month}`}>Calendar</a>
        <a className="rounded-md border border-border bg-white px-3 py-1.5" href={`/viewings?month=${month}&view=list`}>List</a>
      </div>
      {params.view === "list" ? (
        <div className="grid gap-3">
          {data.viewings.map((viewing) => (
            <Panel key={viewing.id}>
              <p className="font-medium">{formatDateTime(viewing.startsAt, viewing.timezone)} – {formatDateTime(viewing.endsAt, viewing.timezone)}</p>
              <p className="text-sm text-muted-foreground">{viewing.status} · Google Calendar {viewing.googleSyncStatus.replaceAll("_", " ")}</p>
              <form action={updateViewingAction} className="mt-2 flex gap-2">
                <input type="hidden" name="viewingId" value={viewing.id} />
                <Select name="status" defaultValue={viewing.status} aria-label="Viewing status">
                  {["scheduled", "confirmed", "completed", "cancelled", "no_show"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                </Select>
                <Button type="submit" variant="secondary">Update</Button>
              </form>
            </Panel>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: first.getUTCDay() }, (_, index) => <div key={`pad-${index}`} />)}
          {cells.map((cell) => (
            <div key={cell.key} className="min-h-16 rounded-md border border-border bg-white p-2 text-sm">
              <span>{cell.label}</span>
              {cell.count ? <p className="text-xs text-primary">{cell.count} viewing{cell.count === 1 ? "" : "s"}</p> : null}
            </div>
          ))}
        </div>
      )}
      <Panel className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">Book a viewing</h2>
        <form className="grid gap-3 md:grid-cols-2" action={async (formData) => { "use server"; await createViewingAction(Object.fromEntries(formData)); }}>
          <Field label="Lead"><Select name="leadId" required>{data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.fullName}</option>)}</Select></Field>
          <Field label="Property"><Select name="propertyId" required>{data.properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</Select></Field>
          <Field label="Starts"><Input name="startsAt" type="datetime-local" required /></Field>
          <Field label="Ends"><Input name="endsAt" type="datetime-local" required /></Field>
          <Field label="Timezone"><Input name="timezone" defaultValue={actor.workspace.timezone} required /></Field>
          <div className="md:col-span-2"><Field label="Notes"><Textarea name="notes" /></Field></div>
          <Button type="submit">Save viewing</Button>
        </form>
      </Panel>
    </div>
  );
}
