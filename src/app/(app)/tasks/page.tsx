import { createTaskAction, updateTaskAction } from "@/lib/actions/crm";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { requireActor, withCrm } from "@/lib/crm/session";
import { formatDateTime } from "@/lib/domain/money";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; status?: string }>;
}) {
  const params = await searchParams;
  const actor = await requireActor();
  const data = await withCrm((db) => ({
    tasks: db.tasks.filter((task) => task.workspaceId === actor.workspaceId && (!params.status || task.status === params.status)),
    leads: db.leads.filter((lead) => lead.workspaceId === actor.workspaceId),
    now: new Date().toISOString(),
  }));
  return (
    <div>
      <PageHeader title="Tasks and follow-ups" description="Pending, in progress, completed, and cancelled work." />
      <Notice message={params.notice} />
      <form className="mb-4">
        <Select name="status" defaultValue={params.status ?? ""} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Button className="ml-2" type="submit" variant="secondary">Filter</Button>
      </form>
      <div className="grid gap-3">
        {data.tasks.map((task) => {
          const overdue = task.dueAt && task.dueAt < data.now && (task.status === "pending" || task.status === "in_progress");
          return (
            <Panel key={task.id}>
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-muted-foreground">
                {task.status}{task.dueAt ? ` · due ${formatDateTime(task.dueAt, actor.workspace.timezone)}` : ""}
                {overdue ? " · overdue" : ""}
              </p>
              <form action={updateTaskAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="taskId" value={task.id} />
                <Select name="status" defaultValue={task.status} aria-label={`Status for ${task.title}`}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                <Input name="dueAt" type="datetime-local" aria-label="Reschedule" />
                <Button type="submit" variant="secondary">Update</Button>
              </form>
            </Panel>
          );
        })}
      </div>
      <Panel className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">New task</h2>
        <form className="grid gap-3 md:grid-cols-2" action={async (formData) => { "use server"; await createTaskAction(Object.fromEntries(formData)); }}>
          <Field label="Title"><Input name="title" required /></Field>
          <Field label="Priority">
            <Select name="priority" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </Field>
          <Field label="Due"><Input name="dueAt" type="datetime-local" /></Field>
          <Field label="Lead">
            <Select name="leadId" defaultValue="">
              <option value="">None</option>
              {data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.fullName}</option>)}
            </Select>
          </Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea name="description" /></Field></div>
          <Button type="submit">Create task</Button>
        </form>
      </Panel>
    </div>
  );
}
