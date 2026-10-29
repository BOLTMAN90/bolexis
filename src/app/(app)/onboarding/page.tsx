import { acceptInvitationAction, createWorkspaceAction } from "@/lib/actions/crm";
import { Notice, PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { getContext } from "@/lib/crm/session";
import { redirect } from "next/navigation";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  const context = await getContext();
  if (context?.workspace) redirect("/overview");
  return (
    <div>
      <PageHeader title="Create your workspace" description="You will be the owner. Invite teammates from settings after the workspace exists." />
      <Notice message={notice} />
      <Panel>
        <form action={createWorkspaceAction} className="grid max-w-lg gap-3">
          <Field label="Business name"><Input name="name" required minLength={2} /></Field>
          <Field label="URL slug"><Input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></Field>
          <Button type="submit">Create workspace</Button>
        </form>
        <form action={acceptInvitationAction} className="mt-6 grid max-w-lg gap-3 border-t border-border pt-4">
          <Field label="Or accept an invitation token"><Input name="token" required autoComplete="off" /></Field>
          <Button type="submit" variant="secondary">Accept invitation</Button>
        </form>
      </Panel>
    </div>
  );
}
