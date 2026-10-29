"use client";

import { useState } from "react";

import { rotateIntakeKeyAction } from "@/lib/actions/crm";
import { Button } from "@/components/ui/button";

export function IntakeKeyButton() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          const result = await rotateIntakeKeyAction();
          if ("error" in result && result.error) setError(result.error);
          if ("token" in result && result.token) setToken(result.token);
        }}
      >
        Rotate website intake key
      </Button>
      {token ? (
        <p className="mt-2 text-sm">
          Copy this key now. It will not be shown again: <code>{token}</code>
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
