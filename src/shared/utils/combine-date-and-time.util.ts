export function combineDateAndTime(date: Date, time: Date): Date {
  const result = new Date(date);
  result.setUTCHours(
    time.getUTCHours(),
    time.getUTCMinutes(),
    time.getUTCSeconds(),
    0,
  );
  return result;
}

export function parseNaiveDateTime(value: string): Date {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}
