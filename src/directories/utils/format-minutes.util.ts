function minutesToUtcDate(minutes: number): Date {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Date(Date.UTC(1970, 0, 1, hours, mins));
}

export { minutesToUtcDate };
