import Link from "next/link";

import { signInWithGoogle, signUpWithPassword } from "@/lib/actions/auth";
import { supabaseAuthConfigured } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  const authReady = supabaseAuthConfigured();
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Create an account</h1>
      {notice ? <p className="text-sm text-teal-800">{notice}</p> : null}
      {authReady ? (
        <>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="secondary" className="w-full">
              Continue with Google
            </Button>
          </form>
          <form action={signUpWithPassword} className="grid gap-3">
            <Field label="Full name">
              <Input name="fullName" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Button type="submit">Create account with email</Button>
          </form>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Email and Google accounts need the Supabase URL and anon key on this server.
        </p>
      )}
      <Link href="/login" className="text-sm text-primary">
        Back to sign in
      </Link>
    </div>
  );
}
