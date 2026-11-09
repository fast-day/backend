const fmt = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const esc = (s = "") =>
  s.replace(/\\/g, "\\\\").replace(/[;,]/g, "\\$&").replace(/\n/g, "\\n");

type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
};

export function buildIcs(e: CalEvent) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FastDay//RU",
    "BEGIN:VEVENT",
    `UID:${e.id}@fast-day.ru`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(e.start)}`,
    `DTEND:${fmt(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(e.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildCalendarLinks(e: CalEvent) {
  const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
  return {
    google:
      "https://calendar.google.com/calendar/render?" +
      q({
        action: "TEMPLATE",
        text: e.title,
        dates: `${fmt(e.start)}/${fmt(e.end)}`,
        details: e.description ?? "",
        location: e.location ?? "",
      }),
    outlook:
      "https://outlook.live.com/calendar/0/deeplink/compose?" +
      q({
        path: "/calendar/action/compose",
        rru: "addevent",
        subject: e.title,
        startdt: e.start.toISOString(),
        enddt: e.end.toISOString(),
        location: e.location ?? "",
      }),
    apple: `${process.env.API_URL}/bookings/${e.id}/calendar.ics`,
  };
}
