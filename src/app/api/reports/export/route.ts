import { NextResponse } from "next/server";

import { requireActor, withCrm } from "@/lib/crm/session";
import { toCsv } from "@/lib/domain/csv";
import { dashboard } from "@/lib/data/operations";

export async function GET(request: Request) {
  const actor = await requireActor();
  const url = new URL(request.url);
  const csv = await withCrm((db) => {
    const report = dashboard(db, actor.workspaceId, actor.userId);
    void url;
    return toCsv(
      ["metric", "value"],
      [
        ["total_leads", report.metrics.totalLeads],
        ["new_leads_this_month", report.metrics.newLeadsThisMonth],
        ["qualified_leads", report.metrics.qualifiedLeads],
        ["pipeline_value", report.metrics.pipelineValue],
        ["weighted_pipeline_value", report.metrics.weightedPipelineValue],
        ["closed_won_value", report.metrics.closedWonValue],
        ["overdue_follow_ups", report.metrics.overdueFollowUps],
      ],
    );
  });
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=bolexis-report.csv",
    },
  });
}
