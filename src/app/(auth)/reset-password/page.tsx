"use client";

import { useState } from "react";

import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const supabase = createBrowserSupabase();
        if (!supabase) {
          setError("Supabase Auth is not configured.");
          return;
        }
        const password = String(new FormData(event.currentTarget).get("password") ?? "");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) setError(updateError.message);
        else setMessage("Password updated. You can sign in.");
      }}
    >
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <p className="text-sm text-muted-foreground">
        Open this page from the Supabase reset email so the recovery session is present.
      </p>
      <Field label="New password">
        <Input name="password" type="password" minLength={8} required />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-teal-800">{message}</p> : null}
      <Button type="submit">Update password</Button>
    </form>
  );
}
