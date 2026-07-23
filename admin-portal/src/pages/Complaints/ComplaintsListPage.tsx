import { ComplaintStatus } from "@abc/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useCategories, useWards } from "../../hooks/useLookups";
import { apiClient } from "../../lib/api-client";
import type { Complaint, Paginated } from "../../lib/types";

const PAGE_SIZE = 20;

export function ComplaintsListPage({ title }: { title: string }) {
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [wardId, setWardId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const categories = useCategories();
  const wards = useWards();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["complaints", { status, categoryId, wardId, search, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (status) params.status = status;
      if (categoryId) params.categoryId = categoryId;
      if (wardId) params.wardId = wardId;
      if (search) params.search = search;
      const res = await apiClient.get<Paginated<Complaint>>("/complaints", { params });
      return res.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function resetToFirstPage(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{data?.total ?? 0} complaint(s)</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search title, description, or complaint #"
            value={search}
            onChange={(e) => resetToFirstPage(setSearch)(e.target.value)}
          />
          <Select value={status} onChange={(e) => resetToFirstPage(setStatus)(e.target.value)}>
            <option value="">All statuses</option>
            {Object.values(ComplaintStatus).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Select value={categoryId} onChange={(e) => resetToFirstPage(setCategoryId)(e.target.value)}>
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={wardId} onChange={(e) => resetToFirstPage(setWardId)(e.target.value)}>
            <option value="">All wards</option>
            {wards.data?.map((w) => (
              <option key={w.id} value={w.id}>
                Ward {w.wardNumber} — {w.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-600">Failed to load complaints.</p>}
        {data && data.items.length === 0 && (
          <p className="p-4 text-sm text-slate-500">No complaints match these filters.</p>
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2">Complaint #</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Citizen</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Ward</th>
                <th className="px-4 py-2">Priority</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Assigned</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-2">
                    <Link to={`/complaints/${c.id}`} className="font-medium text-brand-navy hover:underline">
                      {c.complaintNumber}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2">{c.title}</td>
                  <td className="px-4 py-2">{c.citizen.name}</td>
                  <td className="px-4 py-2">{c.category.name}</td>
                  <td className="px-4 py-2">Ward {c.ward.wardNumber}</td>
                  <td className="px-4 py-2">
                    <Badge tone={c.priority}>{c.priority}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={c.status}>{c.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2">{c.assignedStaff?.name ?? "—"}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md px-3 py-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
