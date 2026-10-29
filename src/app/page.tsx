import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { resolveDataMode, supabaseAuthConfigured } from "@/lib/config";

export default function HomePage() {
  const mode = resolveDataMode();
  const authReady = supabaseAuthConfigured();
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <Logo className="h-10 w-10" />
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-primary">BOLEXIS</p>
          <p className="text-sm text-muted-foreground">Real Estate Intelligence & Automation</p>
        </div>
      </div>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
        Capture leads. Automate follow-ups. Close deals.
      </h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground">
        BOLEXIS is a workspace CRM for agents and brokerages. It qualifies inquiries, tracks listings
        and deals, schedules viewings, and keeps follow-ups in one place.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
          Sign in
        </Link>
        <Link href="/signup" className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium">
          Create an account
        </Link>
      </div>
      {mode.mode === "demo" ? (
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          {authReady
            ? "Email and Google sign-in use your Supabase project. The Northline Realty demo is also available and uses fictional records."
            : "Supabase is not configured, so local demo mode is available from the sign-in page. Demo records are fictional."}
        </p>
      ) : null}
      {mode.mode === "unconfigured" ? <p className="mt-6 text-sm text-destructive">{mode.message}</p> : null}
    </main>
  );
}
