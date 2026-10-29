"use client";

import { useState } from "react";

import { approveAndSendAction, askAssistantAction } from "@/lib/actions/crm";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";

export function AssistantPanel({
  leads,
  configured,
}: {
  leads: { id: string; name: string }[];
  configured: boolean;
}) {
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {!configured ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
          The assistant is unavailable until OPENAI_API_KEY is set on the server. Scores and property matches on lead pages still use the rules engine.
        </p>
      ) : null}
      <form
        className="grid gap-3 rounded-lg border border-border bg-white p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          const response = await askAssistantAction(new FormData(event.currentTarget));
          if ("error" in response && response.error) setError(response.error);
          else if ("message" in response && response.message) setResult(response.message);
          else if ("output" in response && response.output) setResult(JSON.stringify(response.output, null, 2));
        }}
      >
        <label className="text-sm font-medium" htmlFor="leadId">Lead</label>
        <Select id="leadId" name="leadId" required>
          {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
        </Select>
        <label className="text-sm font-medium" htmlFor="kind">Request</label>
        <Select id="kind" name="kind" defaultValue="summary">
          <option value="summary">Summarize recorded facts</option>
          <option value="qualification">Explain the qualification score</option>
          <option value="match">Discuss recorded property matches</option>
          <option value="draft">Draft a follow-up for approval</option>
          <option value="next">Suggest a next step</option>
          <option value="activity">Summarize recorded activity</option>
        </Select>
        <Button type="submit">Generate recommendation</Button>
        <p className="text-xs text-muted-foreground">Generated text is advisory. It cannot change a lead or send a message.</p>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? <pre className="overflow-auto rounded-lg border border-border bg-white p-4 text-sm">{result}</pre> : null}
      <form action={approveAndSendAction} className="rounded-lg border border-border bg-white p-4">
        <h2 className="text-sm font-semibold">Approve and send a saved draft</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter a draft id from a lead page. Sending still requires email configuration and consent.</p>
        <input name="draftId" required className="mt-3 h-9 w-full rounded-md border border-border px-3 text-sm" placeholder="Draft id" />
        <Button className="mt-3" type="submit" variant="secondary">Approve and attempt send</Button>
      </form>
    </div>
  );
}
