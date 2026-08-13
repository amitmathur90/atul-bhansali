import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FilePlus2,
  FileText,
  Megaphone,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { apiClient } from "../../lib/api-client";

interface DashboardData {
  totalComplaints: number;
  todayComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  rejectedComplaints: number;
  activeUsers: number;
  wardAnalytics: { ward?: { name: string; wardNumber: number }; count: number }[];
  categoryAnalytics: { category?: { name: string }; count: number }[];
  staffPerformance: {
    staff?: { name: string };
    assignedCount: number;
    completedCount: number;
    progressPercent: number;
  }[];
  recentComplaints: {
    id: string;
    complaintNumber: string;
    category: string;
    ward: string;
    status: string;
    createdAt: string;
  }[];
  trend: { date: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "प्राप्त",
  ASSIGNED: "सौंपी गई",
  IN_PROGRESS: "प्रगति में",
  COMPLETED: "पूर्ण",
  REJECTED: "रद",
};

const PIE_COLORS = ["#2563eb", "#f97316", "#7c3aed", "#16a34a", "#dc2626", "#0891b2", "#ca8a04"];

export function DashboardPage() {
  const [trendDays, setTrendDays] = useState(14);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-admin", trendDays],
    queryFn: async () =>
      (await apiClient.get<DashboardData>("/dashboard/admin", { params: { trendDays } })).data,
  });

  const wardChartData = useMemo(
    () =>
      data?.wardAnalytics.map((w) => ({
        name: w.ward ? `वार्ड ${w.ward.wardNumber}` : "—",
        count: w.count,
      })) ?? [],
    [data],
  );

  const categoryChartData = useMemo(
    () => data?.categoryAnalytics.map((c) => ({ name: c.category?.name ?? "—", value: c.count })) ?? [],
    [data],
  );

  const trendChartData = useMemo(
    () =>
      data?.trend.map((t) => ({
        date: new Date(t.date).toLocaleDateString("hi-IN", { day: "2-digit", month: "short" }),
        count: t.count,
      })) ?? [],
    [data],
  );

  async function handleExport() {
    const res = await apiClient.get("/reports/export", {
      params: { period: "monthly", type: "excel" },
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "complaints-report.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || !data) return <p className="text-sm text-slate-500">लोड हो रहा है…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">डैशबोर्ड</h1>
        <div className="flex items-center gap-2">
          <select
            value={trendDays}
            onChange={(e) => setTrendDays(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value={7}>पिछले 7 दिन</option>
            <option value={14}>पिछले 14 दिन</option>
            <option value={30}>पिछले 30 दिन</option>
          </select>
          <Button variant="secondary" onClick={handleExport}>
            <Download size={15} /> निर्यात करें
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          icon={<FileText size={18} />}
          color="text-blue-600 bg-blue-100"
          label="कुल शिकायतें"
          value={data.totalComplaints}
          to="/complaints"
        />
        <StatCard
          icon={<Clock size={18} />}
          color="text-amber-600 bg-amber-100"
          label="प्रगति में"
          value={data.pendingComplaints}
          to="/complaints"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          color="text-green-600 bg-green-100"
          label="पूर्ण"
          value={data.resolvedComplaints}
          to="/complaints"
        />
        <StatCard
          icon={<XCircle size={18} />}
          color="text-red-600 bg-red-100"
          label="रद"
          value={data.rejectedComplaints}
          to="/complaints"
        />
        <StatCard
          icon={<Calendar size={18} />}
          color="text-purple-600 bg-purple-100"
          label="आज की शिकायतें"
          value={data.todayComplaints}
          to="/complaints"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">शिकायतों का सारांश</h2>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">श्रेणी अनुसार</h2>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {categoryChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <h2 className="p-4 pb-0 text-sm font-semibold text-slate-700 dark:text-slate-200">हाल की शिकायतें</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">श्रेणी</th>
              <th className="px-4 py-2">स्थान</th>
              <th className="px-4 py-2">स्थिति</th>
              <th className="px-4 py-2">तारीख</th>
              <th className="px-4 py-2">कार्रवाई</th>
            </tr>
          </thead>
          <tbody>
            {data.recentComplaints.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-medium">{c.complaintNumber}</td>
                <td className="px-4 py-2">{c.category}</td>
                <td className="px-4 py-2">{c.ward}</td>
                <td className="px-4 py-2">
                  <Badge tone={c.status}>{STATUS_LABELS[c.status] ?? c.status}</Badge>
                </td>
                <td className="px-4 py-2 text-slate-500">{new Date(c.createdAt).toLocaleDateString("hi-IN")}</td>
                <td className="px-4 py-2">
                  <Link to={`/complaints/${c.id}`} className="text-brand-navy hover:underline">
                    देखें
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="h-4" />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">वार्ड अनुसार शिकायतें</h2>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={wardChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">टॉप अधिकारी प्रदर्शन</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1">अधिकारी</th>
                <th className="py-1">सौंपी गई</th>
                <th className="py-1">पूर्ण</th>
                <th className="py-1">प्रगति %</th>
              </tr>
            </thead>
            <tbody>
              {data.staffPerformance.map((s, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5">{s.staff?.name ?? "—"}</td>
                  <td className="py-1.5">{s.assignedCount}</td>
                  <td className="py-1.5">{s.completedCount}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{ width: `${s.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{s.progressPercent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">त्वरित कार्यवाही</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction icon={<FilePlus2 size={18} />} label="नई शिकायत देखें" to="/complaints" />
          <QuickAction icon={<UserPlus size={18} />} label="अधिकारी असाइन करें" to="/staff" />
          <QuickAction icon={<Megaphone size={18} />} label="नोटिस जारी करें" to="/announcements" />
          <QuickAction icon={<ClipboardList size={18} />} label="रिपोर्ट देखें" to="/reports" />
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
  to,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-3 transition-shadow hover:shadow-lg">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>{icon}</div>
        <div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </Card>
    </Link>
  );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-brand-navy/5 hover:text-brand-navy dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
        {icon}
      </span>
      {label}
    </Link>
  );
}
