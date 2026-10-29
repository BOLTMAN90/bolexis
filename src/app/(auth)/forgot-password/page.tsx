import Link from "next/link";

import { sendPasswordReset } from "@/lib/actions/auth";
import { resolveDataMode } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const notice = (await searchParams).notice;
  const mode = resolveDataMode();
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Reset password</h1>
      {notice ? <p className="text-sm text-teal-800">{notice}</p> : null}
      {mode.mode === "supabase" ? (
        <form action={sendPasswordReset} className="grid gap-3">
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
          <Button type="submit">Send reset link</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Password reset is available after Supabase Auth is configured.
        </p>
      )}
      <Link href="/login" className="text-sm text-primary">
        Back to sign in
      </Link>
    </div>
  );
}
