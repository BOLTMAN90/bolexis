import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader, Panel } from "@/components/shell/app-shell";
import { canMutateCrm } from "@/lib/domain/assignment";
import { requireActor, withCrm } from "@/lib/crm/session";

export default async function NewLeadPage() {
  const actor = await requireActor();
  if (!canMutateCrm(actor.role)) {
    return <p className="text-sm">Your role can view leads but cannot create them.</p>;
  }
  const agents = await withCrm((db) =>
    db.members
      .filter((member) => member.workspaceId === actor.workspaceId && member.active && member.role !== "viewer")
      .map((member) => ({
        id: member.userId,
        name: db.profiles.find((profile) => profile.id === member.userId)?.fullName ?? "Agent",
      })),
  );
  return (
    <div>
      <PageHeader title="New lead" description="The score, assignment, follow-up task, and activity are created with the lead." />
      <Panel>
        <LeadForm agents={agents} />
      </Panel>
    </div>
  );
}
