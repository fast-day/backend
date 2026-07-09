export const getFullName = (
  first?: string | null,
  last?: string | null,
): string => {
  return [first, last].filter(Boolean).join(" ") || "";
};
