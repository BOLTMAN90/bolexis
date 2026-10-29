import Link from "next/link";

import { Notice, PageHeader } from "@/components/shell/app-shell";
import { requireActor, withCrm } from "@/lib/crm/session";
import { duplicateContacts } from "@/lib/data/operations";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const actor = await requireActor();
  const data = await withCrm((db) => {
    const query = (params.q ?? "").toLowerCase();
    return {
      contacts: db.contacts.filter(
        (contact) =>
          contact.workspaceId === actor.workspaceId &&
          !contact.archivedAt &&
          `${contact.fullName} ${contact.email ?? ""} ${contact.phone ?? ""}`.toLowerCase().includes(query),
      ),
      duplicates: duplicateContacts(db, actor.workspaceId),
    };
  });
  return (
    <div>
      <PageHeader title="Contacts" description="People linked to leads. Duplicate hints do not merge records automatically." />
      <Notice message={params.notice} />
      <form className="mb-4">
        <input name="q" defaultValue={params.q} aria-label="Search contacts" placeholder="Search contacts" className="h-9 w-full max-w-md rounded-md border border-border px-3 text-sm" />
      </form>
      {data.duplicates.length > 0 ? (
        <p className="mb-3 text-sm text-amber-800">
          {data.duplicates.length} possible duplicate group{data.duplicates.length === 1 ? "" : "s"}. Review them before editing.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody>
            {data.contacts.map((contact) => (
              <tr key={contact.id} className="border-t border-border">
                <td className="px-3 py-2"><Link className="text-primary" href={`/contacts/${contact.id}`}>{contact.fullName}</Link></td>
                <td className="px-3 py-2">{contact.contactType}</td>
                <td className="px-3 py-2">{contact.email ?? "—"}</td>
                <td className="px-3 py-2">{contact.phone ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
