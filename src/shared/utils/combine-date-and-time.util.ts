export function combineDateAndTime(date: Date, time: Date): Date {
  const result = new Date(date);
  result.setHours(
    time.getUTCHours(),
    time.getUTCMinutes(),
    time.getUTCSeconds(),
    0,
  );
  return result;
}
