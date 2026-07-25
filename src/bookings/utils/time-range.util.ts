export function getBookingTimeRange(
  services: { startTime: Date; endTime: Date }[],
) {
  const start = services.reduce(
    (min, s) => (s.startTime < min ? s.startTime : min),
    services[0].startTime,
  );
  const end = services.reduce(
    (max, s) => (s.endTime > max ? s.endTime : max),
    services[0].endTime,
  );
  return { start, end };
}
