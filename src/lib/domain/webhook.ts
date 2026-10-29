import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

export function signWebhook(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function verifyWebhook(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  now?: Date;
  toleranceMs?: number;
}): { ok: true } | { ok: false; reason: "missing" | "stale" | "signature" } {
  if (!input.secret || !input.timestamp || !input.signature) {
    return { ok: false, reason: "missing" };
  }
  const stamped = Number(input.timestamp);
  if (!Number.isFinite(stamped)) return { ok: false, reason: "stale" };
  const now = (input.now ?? new Date()).getTime();
  const tolerance = input.toleranceMs ?? DEFAULT_TOLERANCE_MS;
  if (Math.abs(now - stamped) > tolerance) return { ok: false, reason: "stale" };

  const expected = signWebhook(input.secret, input.timestamp, input.rawBody);
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(input.signature, "utf8");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, reason: "signature" };
  }
  return { ok: true };
}
