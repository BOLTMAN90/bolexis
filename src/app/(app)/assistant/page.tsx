import { AssistantPanel } from "@/components/assistant/panel";
import { Notice, PageHeader } from "@/components/shell/app-shell";
import { integrationFlags } from "@/lib/config";
import { requireActor, withCrm } from "@/lib/crm/session";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  const actor = await requireActor();
  const leads = await withCrm((db) =>
    db.leads
      .filter((lead) => lead.workspaceId === actor.workspaceId && !lead.archivedAt)
      .map((lead) => ({ id: lead.id, name: lead.fullName })),
  );
  return (
    <div>
      <PageHeader title="AI assistant" description="Recommendations are labeled as generated and require a person before any message is sent." />
      <Notice message={notice} />
      <AssistantPanel leads={leads} configured={integrationFlags().openai} />
    </div>
  );
}
