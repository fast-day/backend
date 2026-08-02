export function normalizeToEpochTime(date: Date): Date {
  return new Date(
    Date.UTC(1970, 0, 1, date.getUTCHours(), date.getUTCMinutes()),
  );
}
