import { IntakeKeyButton } from "@/components/settings/intake-key";
import { InviteMember } from "@/components/settings/invite-member";
import { acceptInvitationAction, setMemberRoleAction, updateProfileAction, updateSettingsAction } from "@/lib/actions/crm";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { integrationFlags } from "@/lib/config";
import { requireActor, withCrm } from "@/lib/crm/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  const actor = await requireActor();
  const flags = integrationFlags();
  const data = await withCrm((db) => ({
    members: db.members
      .filter((member) => member.workspaceId === actor.workspaceId)
      .map((member) => ({
        ...member,
        name: db.profiles.find((profile) => profile.id === member.userId)?.fullName ?? "Member",
      })),
    invitations: db.invitations
      .filter((invitation) => invitation.workspaceId === actor.workspaceId && !invitation.acceptedAt)
      .map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      })),
    connections: db.connections.filter((connection) => connection.workspaceId === actor.workspaceId),
  }));
  const admin = actor.role === "owner" || actor.role === "admin";
  return (
    <div className="grid gap-4">
      <PageHeader title="Settings" description="Profile, workspace, roles, and integration status." />
      <Notice message={notice} />
      <Panel>
        <h2 className="mb-3 text-sm font-semibold">Profile</h2>
        <form action={updateProfileAction} className="grid gap-3 md:grid-cols-2">
          <Field label="Name"><Input name="fullName" defaultValue={actor.user.fullName} required /></Field>
          <Field label="Phone"><Input name="phone" defaultValue={actor.user.phone ?? ""} /></Field>
          <Field label="Timezone"><Input name="timezone" defaultValue={actor.user.timezone} /></Field>
          <Button type="submit">Save profile</Button>
        </form>
      </Panel>
      <Panel>
        <h2 className="mb-3 text-sm font-semibold">Workspace</h2>
        {admin ? (
          <form action={updateSettingsAction} className="grid gap-3 md:grid-cols-2">
            <Field label="Name"><Input name="name" defaultValue={actor.workspace.name} required /></Field>
            <Field label="Currency"><Input name="currency" defaultValue={actor.workspace.currency} maxLength={3} /></Field>
            <Field label="Timezone"><Input name="timezone" defaultValue={actor.workspace.timezone} /></Field>
            <Field label="Assignment">
              <Select name="assignmentStrategy" defaultValue={actor.workspace.assignmentStrategy}>
                <option value="round_robin">Round robin</option>
                <option value="manual">Manual</option>
                <option value="specific_agent">Specific agent</option>
              </Select>
            </Field>
            <Field label="Follow-up due (hours)"><Input name="followUpDueHours" type="number" min="1" defaultValue={actor.workspace.followUpDueHours} /></Field>
            <Field label="Task reminder (hours)"><Input name="taskReminderHours" type="number" min="0" defaultValue={actor.workspace.taskReminderHours} /></Field>
            <Field label="Viewing reminder (hours)"><Input name="viewingReminderHours" type="number" min="0" defaultValue={actor.workspace.viewingReminderHours} /></Field>
            <Button type="submit">Save workspace</Button>
          </form>
        ) : <p className="text-sm text-muted-foreground">Only owners and admins can edit the workspace.</p>}
      </Panel>
      <Panel>
        <h2 className="mb-3 text-sm font-semibold">Members</h2>
        {data.members.map((member) => (
          <form key={member.id} action={setMemberRoleAction} className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <input type="hidden" name="memberId" value={member.id} />
            <span className="w-40">{member.name}</span>
            <Select name="role" defaultValue={member.role} aria-label={`Role for ${member.name}`} disabled={!admin}>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
              <option value="viewer">Viewer</option>
            </Select>
            {admin ? <Button type="submit" variant="secondary">Update role</Button> : null}
          </form>
        ))}
      </Panel>
      <Panel>
        <h2 className="mb-3 text-sm font-semibold">Invitations</h2>
        {admin ? <InviteMember /> : <p className="text-sm text-muted-foreground">Only owners and admins can invite people.</p>}
        <ul className="mt-3 grid gap-1 text-sm">
          {data.invitations.length === 0 ? <li className="text-muted-foreground">No pending invitations.</li> : null}
          {data.invitations.map((invitation) => (
            <li key={invitation.id}>
              {invitation.email} · {invitation.role} · expires {invitation.expiresAt.slice(0, 10)}
            </li>
          ))}
        </ul>
        <form action={acceptInvitationAction} className="mt-4 grid max-w-lg gap-3">
          <Field label="Accept an invitation token">
            <Input name="token" required autoComplete="off" />
          </Field>
          <Button type="submit" variant="secondary">Accept invitation</Button>
        </form>
      </Panel>
      <Panel>
        <h2 className="mb-3 text-sm font-semibold">Integrations</h2>
        <ul className="grid gap-2 text-sm">
          <li>Email (Resend): {flags.email ? "configured" : "not configured"}</li>
          <li>OpenAI: {flags.openai ? "configured" : "not configured"}</li>
          <li>n8n: {flags.n8n ? "configured" : "not connected"}</li>
          <li>Google Calendar: {flags.google ? "credentials present, not yet authorized for this workspace" : "not configured"}</li>
          {data.connections.map((connection) => (
            <li key={connection.id}>{connection.provider}: {connection.status}{connection.lastError ? ` · ${connection.lastError}` : ""}</li>
          ))}
        </ul>
        {flags.google ? <a className="mt-3 inline-block text-sm text-primary" href="/api/integrations/google/start">Connect Google Calendar</a> : null}
        <IntakeKeyButton />
      </Panel>
    </div>
  );
}
