import { integrationFlags } from "@/lib/config";
import { signWebhook } from "@/lib/domain/webhook";

export async function postN8n(path: string, body: unknown, idempotencyKey: string) {
  const base = process.env.N8N_WEBHOOK_BASE_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!integrationFlags().n8n || !base || !secret) {
    return { status: "not_configured" as const };
  }
  const raw = JSON.stringify(body);
  const timestamp = String(Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bolexis-timestamp": timestamp,
        "x-bolexis-signature": signWebhook(secret, timestamp, raw),
        "idempotency-key": idempotencyKey,
      },
      body: raw,
      signal: controller.signal,
    });
    if (!response.ok) {
      return { status: "failed" as const, error: `n8n returned HTTP ${response.status}.` };
    }
    return { status: "succeeded" as const };
  } catch (error) {
    return {
      status: "failed" as const,
      error: error instanceof Error ? error.message : "n8n request failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}
