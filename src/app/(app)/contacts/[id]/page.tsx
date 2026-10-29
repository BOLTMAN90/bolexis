import { notFound } from "next/navigation";

import { archiveContactAction, updateContactAction } from "@/lib/actions/crm";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { requireActor, withCrm } from "@/lib/crm/session";

export default async function ContactDetailPage({
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
    const contact = db.contacts.find((item) => item.id === id && item.workspaceId === actor.workspaceId);
    if (!contact) return null;
    return {
      contact,
      leads: db.leads.filter((lead) => lead.contactId === contact.id),
      activities: db.activities.filter((activity) => activity.recordId === contact.id),
    };
  });
  if (!data) notFound();
  const { contact } = data;
  return (
    <div>
      <PageHeader title={contact.fullName} description={contact.archivedAt ? "Archived" : contact.contactType} />
      <Notice message={notice} />
      <Panel>
        <form action={updateContactAction} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="contactId" value={contact.id} />
          <Field label="Name"><Input name="fullName" defaultValue={contact.fullName} required /></Field>
          <Field label="Type">
            <Select name="contactType" defaultValue={contact.contactType}>
              {["buyer", "seller", "tenant", "landlord", "investor", "other"].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </Field>
          <Field label="Email"><Input name="email" defaultValue={contact.email ?? ""} /></Field>
          <Field label="Phone"><Input name="phone" defaultValue={contact.phone ?? ""} /></Field>
          <div className="md:col-span-2"><Field label="Notes"><Textarea name="notes" defaultValue={contact.notes} /></Field></div>
          <Button type="submit">Save contact</Button>
        </form>
        <form action={archiveContactAction} className="mt-4">
          <input type="hidden" name="contactId" value={contact.id} />
          <Button type="submit" variant="danger">Archive contact</Button>
        </form>
      </Panel>
      <Panel className="mt-4">
        <h2 className="text-sm font-semibold">Related leads</h2>
        {data.leads.map((lead) => (
          <p key={lead.id} className="mt-2 text-sm">{lead.fullName} · {lead.status}</p>
        ))}
        <h2 className="mt-4 text-sm font-semibold">Activity</h2>
        {data.activities.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No recorded activity.</p> : null}
        {data.activities.map((activity) => (
          <p key={activity.id} className="mt-2 text-sm">{activity.eventType}</p>
        ))}
      </Panel>
    </div>
  );
}
