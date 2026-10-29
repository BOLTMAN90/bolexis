import Link from "next/link";

import { runRemindersAction, toggleWorkflowAction } from "@/lib/actions/crm";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { integrationFlags } from "@/lib/config";
import { requireActor, withCrm } from "@/lib/crm/session";

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  const actor = await requireActor();
  const flags = integrationFlags();
  const workflows = await withCrm((db) =>
    db.workflows
      .filter((workflow) => workflow.workspaceId === actor.workspaceId)
      .map((workflow) => ({
        ...workflow,
        lastRun: db.runs
          .filter((run) => run.workflowId === workflow.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,
      })),
  );
  return (
    <div>
      <PageHeader title="Automations" description="In-app jobs run here. External n8n execution is shown only after a real response." />
      <Notice message={notice} />
      <Panel className="mb-4">
        <p className="text-sm">n8n is {flags.n8n ? "configured" : "not connected"}.</p>
        <p className="text-sm">Email delivery is {flags.email ? "configured" : "not configured"}.</p>
        <form action={runRemindersAction} className="mt-3">
          <Button type="submit" variant="secondary">Run due reminders</Button>
        </form>
      </Panel>
      <div className="grid gap-3">
        {workflows.map((workflow) => (
          <Panel key={workflow.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/automations/${workflow.id}`} className="font-medium text-primary">{workflow.name}</Link>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{workflow.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Trigger: {workflow.triggerType.replaceAll("_", " ")} · {workflow.enabled ? "Enabled" : "Disabled"} · Last run: {workflow.lastRun ? `${workflow.lastRun.status}` : "none"}
                </p>
                {workflow.lastRun?.errorDetail ? <p className="text-xs text-destructive">{workflow.lastRun.errorDetail}</p> : null}
                {workflow.lastRun ? <p className="text-xs text-muted-foreground">{JSON.stringify(workflow.lastRun.metadata)}</p> : null}
              </div>
              <form action={toggleWorkflowAction}>
                <input type="hidden" name="workflowId" value={workflow.id} />
                <input type="hidden" name="enabled" value={workflow.enabled ? "false" : "true"} />
                <Button type="submit" variant="secondary">{workflow.enabled ? "Disable" : "Enable"}</Button>
              </form>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
