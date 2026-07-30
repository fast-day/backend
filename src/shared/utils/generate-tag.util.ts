export function generateTag(prefix: string, sequence: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(sequence).padStart(6, "0");
  return `${prefix}-${year}${month}-${seq}`;
}
