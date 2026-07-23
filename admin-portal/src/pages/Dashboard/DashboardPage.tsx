import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../../components/ui/Card";
import { apiClient } from "../../lib/api-client";

interface DashboardData {
  todayComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  activeUsers: number;
  wardAnalytics: { ward?: { name: string; wardNumber: number }; count: number }[];
  categoryAnalytics: { category?: { name: string }; count: number }[];
  staffPerformance: { staff?: { name: string }; assignedCount: number }[];
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-admin"],
    queryFn: async () => (await apiClient.get<DashboardData>("/dashboard/admin")).data,
  });

  if (isLoading || !data) return <p className="text-sm text-slate-500">Loading…</p>;

  const wardChartData = data.wardAnalytics.map((w) => ({
    name: w.ward ? `Ward ${w.ward.wardNumber}` : "—",
    count: w.count,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Complaints" value={data.todayComplaints} />
        <StatCard label="Pending" value={data.pendingComplaints} />
        <StatCard label="Resolved" value={data.resolvedComplaints} />
        <StatCard label="Active Citizens" value={data.activeUsers} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Ward-wise complaint volume
          </h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={wardChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Category breakdown</h2>
          <ul className="flex flex-col gap-2">
            {data.categoryAnalytics.map((c, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{c.category?.name ?? "—"}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{c.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Staff performance</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1">Staff</th>
              <th className="py-1">Assigned complaints</th>
            </tr>
          </thead>
          <tbody>
            {data.staffPerformance.map((s, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5">{s.staff?.name ?? "—"}</td>
                <td className="py-1.5">{s.assignedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );
}
