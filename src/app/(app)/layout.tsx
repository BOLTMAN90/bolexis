import { redirect } from "next/navigation";

import { signOut, switchWorkspace } from "@/lib/actions/auth";
import { AppShell } from "@/components/shell/app-shell";
import { resolveDataMode } from "@/lib/config";
import { getContext } from "@/lib/crm/session";
import { withCrm } from "@/lib/crm/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const mode = resolveDataMode();
  if (mode.mode === "unconfigured") redirect("/setup");
  const context = await getContext();
  if (!context) redirect("/login");
  const notifications = context.workspace
    ? await withCrm((db, userId) =>
        db.notifications
          .filter((item) => item.recipientId === userId && item.workspaceId === context.workspace?.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 8),
      )
    : [];

  return (
    <AppShell
      userName={context.user.fullName || context.user.email || "Account"}
      workspaceName={context.workspace?.name ?? "No workspace"}
      workspaces={context.workspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }))}
      notifications={notifications}
      demo={context.mode === "demo"}
      switchWorkspace={switchWorkspace}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
