import { formatInTimeZone } from "date-fns-tz";

function formatIntervalTime(time: Date, timezone: string): string {
  const utcDate = new Date(
    Date.UTC(1970, 0, 1, time.getUTCHours(), time.getUTCMinutes()),
  );
  return formatInTimeZone(utcDate, timezone, "HH:mm");
}

export { formatIntervalTime };
