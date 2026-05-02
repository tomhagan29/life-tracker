export function parseUtcDateInput(date?: string) {
  return date ? new Date(`${date}T00:00:00Z`) : null;
}

export function getUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isSameUtcDate(left: Date, right: Date) {
  return getUtcDateKey(left) === getUtcDateKey(right);
}

export const utcShortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const utcDisplayDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
