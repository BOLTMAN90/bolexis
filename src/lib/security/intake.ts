import { createHash, timingSafeEqual } from "node:crypto";

export function intakeKeyMatches(hash: string | null, token: string) {
  if (!hash || !token) return false;
  const actual = createHash("sha256").update(token).digest("hex");
  const left = Buffer.from(hash);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}
