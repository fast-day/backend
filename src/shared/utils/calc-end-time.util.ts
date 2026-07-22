export function calcEndTime(start_time: string, duration: number): string {
  const [hours, minutes] = start_time.split(":").map(Number);
  const total = hours * 60 + minutes + duration;
  const endHours = Math.floor(total / 60) % 24;
  const endMinutes = total % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

export function calcEndTimeDate(
  startTime: Date,
  durationMinutes: number,
): Date {
  return new Date(startTime.getTime() + durationMinutes * 60_000);
}
