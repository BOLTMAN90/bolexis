"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { NAV_ITEMS } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

export type ShellNotification = { id: string; title: string; body: string; createdAt: string; readAt: string | null };
export type ShellWorkspace = { id: string; name: string };

export function AppShell({
  children,
  userName,
  workspaceName,
  workspaces,
  notifications,
  demo,
  switchWorkspace,
  signOut,
}: {
  children: React.ReactNode;
  userName: string;
  workspaceName: string;
  workspaces: ShellWorkspace[];
  notifications: ShellNotification[];
  demo: boolean;
  switchWorkspace: (formData: FormData) => Promise<void>;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const unread = notifications.filter((item) => !item.readAt).length;

  const nav = (
    <nav className="grid gap-1" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground",
              active ? "bg-[#16365F]" : "hover:bg-[#16365F]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={cn(collapsed && "lg:sr-only")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {demo ? (
        <div className="bg-[#134e4a] px-4 py-2 text-center text-sm text-white">
          Demo workspace. Northline Realty records are fictional and are not live customer data.
        </div>
      ) : null}
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex",
            collapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <div className="flex items-center gap-2 px-3 py-4">
            <Logo />
            <div className={cn(collapsed && "lg:hidden")}>
              <p className="text-sm font-semibold tracking-wide">BOLEXIS</p>
              <p className="text-xs text-slate-300">Intelligence & Automation</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2">{nav}</div>
          <button
            type="button"
            className="m-3 rounded-md px-3 py-2 text-left text-xs text-slate-300 hover:bg-[#16365F]"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-white px-4 py-3">
            <button
              type="button"
              className="rounded-md p-2 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <form action="/search" className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                aria-label="Search leads, contacts, and properties"
                placeholder="Search leads, contacts, properties"
                className="h-9 w-full rounded-md border border-border bg-muted pl-9 pr-3 text-sm"
              />
            </form>
            <form action={switchWorkspace} className="ml-auto">
              <label className="sr-only" htmlFor="workspaceId">
                Workspace
              </label>
              <select
                id="workspaceId"
                name="workspaceId"
                defaultValue={workspaces.find((item) => item.name === workspaceName)?.id}
                className="h-9 rounded-md border border-border bg-white px-2 text-sm"
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </form>
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm">
                Notifications{unread ? ` (${unread})` : ""}
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-border bg-white p-3 shadow-lg">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications.</p>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className="border-b border-border py-2 last:border-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.body}</p>
                    </div>
                  ))
                )}
              </div>
            </details>
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm">{userName}</summary>
              <div className="absolute right-0 z-30 mt-2 w-48 rounded-lg border border-border bg-white p-2 shadow-lg">
                <Link className="block rounded-md px-2 py-2 text-sm hover:bg-muted" href="/settings">
                  Profile and settings
                </Link>
                <form action={signOut}>
                  <button className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </header>
          <main className="px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-[#0B1F3A]/40" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 bg-sidebar p-4 text-sidebar-foreground">
            <div className="mb-4 flex items-center gap-2">
              <Logo />
              <span className="font-semibold">BOLEXIS</span>
            </div>
            {nav}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-border bg-card p-4", className)}>{children}</section>;
}

export function Notice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-md border border-teal-200 bg-accent px-3 py-2 text-sm text-teal-900" role="status">
      {message}
    </p>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
