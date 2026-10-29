import Link from "next/link";

import { Notice, PageHeader } from "@/components/shell/app-shell";
import { requireActor, withCrm } from "@/lib/crm/session";
import { formatMoney } from "@/lib/domain/money";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const actor = await requireActor();
  const properties = await withCrm((db) => {
    const query = (params.q ?? "").toLowerCase();
    return db.properties.filter(
      (property) =>
        property.workspaceId === actor.workspaceId &&
        !property.archivedAt &&
        `${property.title} ${property.city} ${property.propertyType}`.toLowerCase().includes(query),
    );
  });
  return (
    <div>
      <PageHeader
        title="Properties"
        description="Sale and rental listings in this workspace."
        action={<Link className="rounded-md bg-primary px-3 py-2 text-sm text-white" href="/properties/new">New property</Link>}
      />
      <Notice message={params.notice} />
      <form className="mb-4">
        <input name="q" defaultValue={params.q} aria-label="Search properties" placeholder="Search listings" className="h-9 w-full max-w-md rounded-md border border-border px-3 text-sm" />
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {properties.map((property) => (
          <Link key={property.id} href={`/properties/${property.id}`} className="rounded-lg border border-border bg-white p-4">
            <p className="font-medium">{property.title}</p>
            <p className="text-sm text-muted-foreground">{property.city} · {property.propertyType.replaceAll("_", " ")} · {property.listingType}</p>
            <p className="mt-2 text-sm">{formatMoney(property.priceAmount, property.priceCurrency)} · {property.availability.replaceAll("_", " ")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
