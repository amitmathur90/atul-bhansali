import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { apiClient } from "../../lib/api-client";

interface Citizen {
  id: string;
  name: string;
  phone: string;
  isBlocked: boolean;
  ward: { name: string; wardNumber: number } | null;
  createdAt: string;
  _count: { complaints: number };
}

interface CitizenComplaint {
  id: string;
  complaintNumber: string;
  title: string;
  status: string;
  createdAt: string;
}

export function CitizensPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["citizens", search],
    queryFn: async () =>
      (await apiClient.get<{ items: Citizen[]; total: number }>("/citizens", { params: { search, pageSize: 50 } }))
        .data,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Citizens</h1>
        <p className="text-sm text-slate-500">{data?.total ?? 0} citizen(s)</p>
      </div>

      <Input placeholder="Search by name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        {data?.items.length === 0 && <p className="p-4 text-sm text-slate-500">No citizens found.</p>}
        <ul>
          {data?.items.map((c) => (
            <CitizenRow
              key={c.id}
              citizen={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function CitizenRow({
  citizen,
  expanded,
  onToggle,
}: {
  citizen: Citizen;
  expanded: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();

  const blockMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/citizens/${citizen.id}/block`, { isBlocked: !citizen.isBlocked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["citizens"] }),
  });

  const complaintsQuery = useQuery({
    queryKey: ["citizen-complaints", citizen.id],
    queryFn: async () =>
      (await apiClient.get<{ items: CitizenComplaint[] }>(`/citizens/${citizen.id}/complaints`)).data.items,
    enabled: expanded,
  });

  return (
    <li className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <div className="flex items-center justify-between p-4">
        <button className="text-left" onClick={onToggle}>
          <p className="font-medium text-slate-800 dark:text-slate-100">{citizen.name}</p>
          <p className="text-xs text-slate-500">
            {citizen.phone} · {citizen.ward ? `Ward ${citizen.ward.wardNumber}` : "No ward"} ·{" "}
            {citizen._count.complaints} complaint(s)
          </p>
        </button>
        <div className="flex items-center gap-2">
          {citizen.isBlocked && <Badge tone="REJECTED">BLOCKED</Badge>}
          <Button variant={citizen.isBlocked ? "secondary" : "danger"} onClick={() => blockMutation.mutate()}>
            {citizen.isBlocked ? "Unblock" : "Block"}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
          {complaintsQuery.data?.length === 0 && <p className="text-sm text-slate-500">No complaints filed.</p>}
          <ul className="flex flex-col gap-1.5">
            {complaintsQuery.data?.map((c) => (
              <li key={c.id} className="flex justify-between text-sm">
                <span>
                  {c.complaintNumber} — {c.title}
                </span>
                <Badge tone={c.status}>{c.status.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
