import type { ReactNode } from "react";

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-700",
  EMERGENCY: "bg-red-100 text-red-700",
  PENDING: "bg-brand-saffron/20 text-brand-saffron-dark",
  SCHEDULED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const classes = (tone && STATUS_COLORS[tone]) || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {children}
    </span>
  );
}
