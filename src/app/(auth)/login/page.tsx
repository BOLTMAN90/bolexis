import Link from "next/link";

import { enterDemo, signInWithGoogle, signInWithPassword } from "@/lib/actions/auth";
import { resolveDataMode, supabaseAuthConfigured } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  const mode = resolveDataMode();
  const authReady = supabaseAuthConfigured();
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use email or Google.</p>
      </div>
      {params.notice ? <p className="text-sm text-teal-800">{params.notice}</p> : null}
      {authReady ? (
        <>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="secondary" className="w-full">
              Continue with Google
            </Button>
          </form>
          <form action={signInWithPassword} className="grid gap-3">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Button type="submit">Sign in with email</Button>
          </form>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Email and Google sign-in need the Supabase URL and anon key on this server.
        </p>
      )}
      {mode.mode === "demo" ? (
        <form action={enterDemo}>
          <Button type="submit" variant="secondary" className="w-full">
            Continue in the Northline Realty demo
          </Button>
        </form>
      ) : null}
      {mode.message ? <p className="text-sm text-destructive">{mode.message}</p> : null}
      <div className="flex justify-between text-sm">
        <Link href="/signup" className="text-primary">
          Create an account
        </Link>
        <Link href="/forgot-password" className="text-primary">
          Forgot password
        </Link>
      </div>
    </div>
  );
}
