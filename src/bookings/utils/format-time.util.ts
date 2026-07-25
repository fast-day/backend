import { formatInTimeZone } from "date-fns-tz";

function formatBookingTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "HH:mm");
}

function formatDateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

export { formatBookingTime, formatDateInTimezone };
