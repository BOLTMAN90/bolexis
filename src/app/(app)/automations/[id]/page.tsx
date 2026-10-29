import { notFound } from "next/navigation";

import { PageHeader, Panel } from "@/components/shell/app-shell";
import { requireActor, withCrm } from "@/lib/crm/session";

export default async function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();
  const data = await withCrm((db) => {
    const workflow = db.workflows.find((item) => item.id === id && item.workspaceId === actor.workspaceId);
    if (!workflow) return null;
    return {
      workflow,
      runs: db.runs.filter((run) => run.workflowId === workflow.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  });
  if (!data) notFound();
  return (
    <div>
      <PageHeader title={data.workflow.name} description={data.workflow.description} />
      <Panel>
        <p className="text-sm">Configuration: {JSON.stringify(data.workflow.config)}</p>
      </Panel>
      <div className="mt-4 grid gap-3">
        {data.runs.length === 0 ? <p className="text-sm text-muted-foreground">No executions yet.</p> : null}
        {data.runs.map((run) => (
          <Panel key={run.id}>
            <p className="text-sm font-medium">{run.status} · {run.createdAt}</p>
            <p className="text-xs text-muted-foreground">Correlation {run.correlationId}</p>
            {run.errorDetail ? <p className="text-sm text-destructive">{run.errorDetail}</p> : null}
            <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(run.metadata, null, 2)}</pre>
          </Panel>
        ))}
      </div>
    </div>
  );
}
