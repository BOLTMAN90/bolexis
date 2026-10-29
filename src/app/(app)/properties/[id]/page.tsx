import { notFound } from "next/navigation";

import { uploadPropertyImageAction } from "@/lib/actions/crm";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { requireActor, withCrm } from "@/lib/crm/session";
import { formatMoney } from "@/lib/domain/money";

export default async function PropertyDetailPage({
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
    const property = db.properties.find((item) => item.id === id && item.workspaceId === actor.workspaceId);
    if (!property) return null;
    return {
      property,
      images: db.images.filter((image) => image.propertyId === property.id),
      deals: db.deals.filter((deal) => deal.propertyId === property.id),
      viewings: db.viewings.filter((viewing) => viewing.propertyId === property.id),
    };
  });
  if (!data) notFound();
  const { property } = data;
  return (
    <div>
      <PageHeader title={property.title} description={`${property.city} · ${property.availability.replaceAll("_", " ")}`} />
      <Notice message={notice} />
      <Panel>
        <p className="text-sm">{property.description}</p>
        <p className="mt-3 text-sm">{formatMoney(property.priceAmount, property.priceCurrency)} · {property.bedrooms ?? "—"} bed · {property.bathrooms ?? "—"} bath · {property.areaValue ?? "—"} {property.areaUnit}</p>
        <form action={uploadPropertyImageAction} className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="propertyId" value={property.id} />
          <label htmlFor="image">Add JPEG, PNG, or WebP up to 5 MB</label>
          <input id="image" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
          <Button type="submit" variant="secondary">Upload</Button>
        </form>
        <ul className="mt-3 text-sm">
          {data.images.map((image) => (
            <li key={image.id}>{image.storagePath.startsWith("demo/") ? "Stored in local demo files" : "Stored in Supabase"} · {image.altText}</li>
          ))}
        </ul>
      </Panel>
      <Panel className="mt-4">
        <h2 className="text-sm font-semibold">Related deals and viewings</h2>
        {data.deals.map((deal) => <p key={deal.id} className="mt-2 text-sm">{deal.title} · {deal.stage}</p>)}
        {data.viewings.map((viewing) => <p key={viewing.id} className="mt-2 text-sm">{viewing.startsAt} · {viewing.status} · {viewing.googleSyncStatus.replaceAll("_", " ")}</p>)}
      </Panel>
    </div>
  );
}
