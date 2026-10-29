import { createHmac, timingSafeEqual } from "node:crypto";

import { DEMO_USER_ID } from "@/lib/demo/seed";

export const DEMO_COOKIE = "bolexis_demo";
export const WORKSPACE_COOKIE = "bolexis_workspace";

type DemoPayload = { userId: string; exp: number };

function secret(): string {
  const configured = process.env.DEMO_SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DEMO_SESSION_SECRET is required when demo mode is enabled in production.");
  }
  return "local-demo-only-not-for-production";
}

export function signDemoSession(userId = DEMO_USER_ID, ttlMs = 1000 * 60 * 60 * 12): string {
  const payload: DemoPayload = { userId, exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readDemoSession(token: string | undefined): DemoPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DemoPayload;
    if (!payload.userId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
