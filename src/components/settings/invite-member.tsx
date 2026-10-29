"use client";

import { useState } from "react";

import { createInvitationAction } from "@/lib/actions/crm";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";

export function InviteMember() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setToken(null);
        const form = new FormData(event.currentTarget);
        const result = await createInvitationAction({
          email: String(form.get("email") ?? ""),
          role: String(form.get("role") ?? ""),
        });
        setPending(false);
        if ("error" in result && result.error) setError(result.error);
        if ("token" in result && result.token) setToken(result.token);
      }}
    >
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="agent">
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
          <option value="viewer">Viewer</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        Create invitation
      </Button>
      {token ? (
        <p className="text-sm md:col-span-2">
          Copy this invitation token now. It is stored only as a hash and will not be shown again:{" "}
          <code>{token}</code>
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
    </form>
  );
}
