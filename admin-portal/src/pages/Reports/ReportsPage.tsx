import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { apiClient } from "../../lib/api-client";
import { downloadFile } from "../../lib/download";

type Period = "daily" | "weekly" | "monthly" | "yearly";

interface PeriodSummary {
  period: Period;
  start: string;
  end: string;
  total: number;
  received: number;
  assigned: number;
  inProgress: number;
  completed: number;
  rejected: number;
}

interface WardRow {
  ward: { name: string; wardNumber: number };
  total: number;
  pending: number;
  completed: number;
}

interface CategoryRow {
  category: { name: string };
  total: number;
  pending: number;
  completed: number;
}

interface OfficerRow {
  staff: { name: string };
  assigned: number;
  pending: number;
  completed: number;
  avgResolutionHours: number | null;
}

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [downloading, setDownloading] = useState<"excel" | "pdf" | null>(null);

  const summary = useQuery({
    queryKey: ["report-summary", period],
    queryFn: async () => (await apiClient.get<PeriodSummary>(`/reports/complaints?period=${period}`)).data,
  });
  const wardWise = useQuery({
    queryKey: ["report-ward-wise"],
    queryFn: async () => (await apiClient.get<{ items: WardRow[] }>("/reports/ward-wise")).data.items,
  });
  const categoryWise = useQuery({
    queryKey: ["report-category-wise"],
    queryFn: async () => (await apiClient.get<{ items: CategoryRow[] }>("/reports/category-wise")).data.items,
  });
  const officerWise = useQuery({
    queryKey: ["report-officer-wise"],
    queryFn: async () => (await apiClient.get<{ items: OfficerRow[] }>("/reports/officer-wise")).data.items,
  });

  async function handleExport(type: "excel" | "pdf") {
    setDownloading(type);
    try {
      await downloadFile(`/reports/export?type=${type}&period=${period}`, `report-${period}.${type === "excel" ? "xlsx" : "pdf"}`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Reports</h1>
        <div className="flex items-center gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-auto">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
          <Button variant="secondary" onClick={() => handleExport("excel")} disabled={downloading !== null}>
            {downloading === "excel" ? "Exporting…" : "Export Excel"}
          </Button>
          <Button variant="secondary" onClick={() => handleExport("pdf")} disabled={downloading !== null}>
            {downloading === "pdf" ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {summary.data && (
        <Card>
          <p className="mb-2 text-xs text-slate-500">
            {new Date(summary.data.start).toLocaleDateString()} – {new Date(summary.data.end).toLocaleDateString()}
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <Stat label="Total" value={summary.data.total} />
            <Stat label="Received" value={summary.data.received} />
            <Stat label="Assigned" value={summary.data.assigned} />
            <Stat label="In Progress" value={summary.data.inProgress} />
            <Stat label="Completed" value={summary.data.completed} />
            <Stat label="Rejected" value={summary.data.rejected} />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Ward-wise</h2>
          <ReportTable
            rows={wardWise.data ?? []}
            columns={[
              { label: "Ward", render: (r: WardRow) => `Ward ${r.ward.wardNumber}` },
              { label: "Total", render: (r: WardRow) => r.total },
              { label: "Pending", render: (r: WardRow) => r.pending },
              { label: "Completed", render: (r: WardRow) => r.completed },
            ]}
          />
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Category-wise</h2>
          <ReportTable
            rows={categoryWise.data ?? []}
            columns={[
              { label: "Category", render: (r: CategoryRow) => r.category.name },
              { label: "Total", render: (r: CategoryRow) => r.total },
              { label: "Pending", render: (r: CategoryRow) => r.pending },
              { label: "Completed", render: (r: CategoryRow) => r.completed },
            ]}
          />
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Officer-wise</h2>
          <ReportTable
            rows={officerWise.data ?? []}
            columns={[
              { label: "Officer", render: (r: OfficerRow) => r.staff.name },
              { label: "Assigned", render: (r: OfficerRow) => r.assigned },
              { label: "Completed", render: (r: OfficerRow) => r.completed },
              {
                label: "Avg (hrs)",
                render: (r: OfficerRow) => (r.avgResolutionHours ? r.avgResolutionHours.toFixed(1) : "—"),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ReportTable<T>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { label: string; render: (row: T) => React.ReactNode }[];
}) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>;
  return (
    <table className="w-full text-left text-xs">
      <thead className="uppercase text-slate-500">
        <tr>
          {columns.map((c) => (
            <th key={c.label} className="py-1">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
            {columns.map((c) => (
              <td key={c.label} className="py-1.5">
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
