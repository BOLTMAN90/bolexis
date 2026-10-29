export function claimIdempotency<T>(
  records: Map<string, T>,
  key: string,
  create: () => T,
): { created: boolean; value: T } {
  const existing = records.get(key);
  if (existing) return { created: false, value: existing };
  const value = create();
  records.set(key, value);
  return { created: true, value };
}

export type ReminderMarker = {
  dedupeKey: string;
};

export function queueReminderOnce(
  sent: Set<string>,
  dedupeKey: string,
): { queued: boolean } {
  if (sent.has(dedupeKey)) return { queued: false };
  sent.add(dedupeKey);
  return { queued: true };
}
