export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function getReportDateRange(period: ReportPeriod, anchor: Date = new Date()) {
  const start = startOfDay(anchor);
  const end = endOfDay(anchor);

  switch (period) {
    case "daily":
      return { start, end };
    case "weekly": {
      // Week starts Monday.
      const day = start.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() - diffToMonday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return { start: weekStart, end: endOfDay(weekEnd) };
    }
    case "monthly": {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { start: startOfDay(monthStart), end: endOfDay(monthEnd) };
    }
    case "yearly": {
      const yearStart = new Date(anchor.getFullYear(), 0, 1);
      const yearEnd = new Date(anchor.getFullYear(), 11, 31);
      return { start: startOfDay(yearStart), end: endOfDay(yearEnd) };
    }
  }
}
