import Link from "next/link";

import { PageHeader } from "@/components/shell/app-shell";
import { requireActor, withCrm } from "@/lib/crm/session";
import { searchWorkspace } from "@/lib/data/operations";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q ?? "";
  const actor = await requireActor();
  const results = await withCrm((db) => searchWorkspace(db, actor.workspaceId, query));
  return (
    <div>
      <PageHeader title="Search" description={query ? `Results for “${query}”` : "Enter a name, email, phone, or listing."} />
      <form className="mb-4 md:hidden">
        <input name="q" defaultValue={query} aria-label="Search" className="h-9 w-full rounded-md border border-border px-3 text-sm" />
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        <section>
          <h2 className="mb-2 text-sm font-semibold">Leads</h2>
          {results.leads.map((lead) => <Link key={lead.id} className="block py-1 text-sm text-primary" href={`/leads/${lead.id}`}>{lead.fullName}</Link>)}
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold">Contacts</h2>
          {results.contacts.map((contact) => <Link key={contact.id} className="block py-1 text-sm text-primary" href={`/contacts/${contact.id}`}>{contact.fullName}</Link>)}
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold">Properties</h2>
          {results.properties.map((property) => <Link key={property.id} className="block py-1 text-sm text-primary" href={`/properties/${property.id}`}>{property.title}</Link>)}
        </section>
      </div>
    </div>
  );
}
