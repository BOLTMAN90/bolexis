import { NextResponse } from "next/server";

import { requireActor, withCrm } from "@/lib/crm/session";
import { toCsv } from "@/lib/domain/csv";

export async function GET() {
  const actor = await requireActor();
  const csv = await withCrm((db) => {
    const leads = db.leads.filter((lead) => lead.workspaceId === actor.workspaceId && !lead.archivedAt);
    return toCsv(
      ["full_name", "email", "phone", "source", "status", "budget_amount", "budget_currency", "preferred_location", "property_type", "buying_timeline_days", "notes", "consent_to_contact"],
      leads.map((lead) => [
        lead.fullName,
        lead.email,
        lead.phone,
        lead.source,
        lead.status,
        lead.budgetAmount,
        lead.budgetCurrency,
        lead.preferredLocation,
        lead.propertyType,
        lead.buyingTimelineDays,
        lead.notes,
        lead.consentToContact ? "true" : "false",
      ]),
    );
  });
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=bolexis-leads.csv",
    },
  });
}
