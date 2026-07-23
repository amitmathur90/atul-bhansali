import { StaffRole } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useCategories, useWards } from "../../hooks/useLookups";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

interface StaffMember {
  id: string;
  name: string;
  username: string;
  role: string;
  designation: string | null;
  isActive: boolean;
  wardAssignments: { ward: { id: string; name: string; wardNumber: number } }[];
  categoryAssignments: { category: { id: string; name: string } }[];
}

export function StaffPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(StaffRole.STAFF);
  const [designation, setDesignation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-all"],
    queryFn: async () => (await apiClient.get<{ items: StaffMember[] }>("/staff/all")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.post("/staff", { name, username, password, role, designation: designation || undefined }))
        .data,
    onSuccess: () => {
      setName("");
      setUsername("");
      setPassword("");
      setDesignation("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["staff-all"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/staff/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-all"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Staff Management</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Create staff</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value={StaffRole.STAFF}>Staff</option>
            <option value={StaffRole.MLA}>MLA</option>
            <option value={StaffRole.SUPER_ADMIN}>Super Admin</option>
          </Select>
          <Input placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button
          disabled={!name || !username || password.length < 6 || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="mt-3"
        >
          {createMutation.isPending ? "Creating…" : "Create staff"}
        </Button>
      </Card>

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        <ul>
          {data?.map((s) => (
            <StaffRow
              key={s.id}
              staff={s}
              expanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              onDeactivate={() => deactivateMutation.mutate(s.id)}
            />
          ))}
        </ul>
      </Card>
    </div>
  );
}

interface Performance {
  assigned: number;
  completed: number;
  pending: number;
  rejected: number;
}

function StaffRow({
  staff,
  expanded,
  onToggle,
  onDeactivate,
}: {
  staff: StaffMember;
  expanded: boolean;
  onToggle: () => void;
  onDeactivate: () => void;
}) {
  const queryClient = useQueryClient();
  const wards = useWards();
  const categories = useCategories();
  const [wardIds, setWardIds] = useState<string[]>(staff.wardAssignments.map((a) => a.ward.id));
  const [categoryIds, setCategoryIds] = useState<string[]>(staff.categoryAssignments.map((a) => a.category.id));

  const performanceQuery = useQuery({
    queryKey: ["staff-performance", staff.id],
    queryFn: async () => (await apiClient.get<Performance>(`/staff/${staff.id}/performance`)).data,
    enabled: expanded,
  });

  const assignMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/staff/${staff.id}/assignments`, { wardIds, categoryIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-all"] }),
  });

  function toggleWard(id: string) {
    setWardIds((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
  }
  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  return (
    <li className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <div className="flex items-center justify-between p-4">
        <button className="text-left" onClick={onToggle}>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {staff.name} {!staff.isActive && <Badge>INACTIVE</Badge>}
          </p>
          <p className="text-xs text-slate-500">
            {staff.username} · {staff.role} {staff.designation ? `· ${staff.designation}` : ""}
          </p>
        </button>
        {staff.isActive && (
          <Button variant="danger" onClick={onDeactivate}>
            Deactivate
          </Button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
          {performanceQuery.data && (
            <div className="mb-4 grid grid-cols-4 gap-3 text-sm">
              <Stat label="Assigned" value={performanceQuery.data.assigned} />
              <Stat label="Pending" value={performanceQuery.data.pending} />
              <Stat label="Completed" value={performanceQuery.data.completed} />
              <Stat label="Rejected" value={performanceQuery.data.rejected} />
            </div>
          )}

          {staff.role === StaffRole.STAFF && (
            <>
              <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Assigned wards</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {wards.data?.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => toggleWard(w.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      wardIds.includes(w.id)
                        ? "border-brand-navy bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/30"
                        : "border-slate-300 text-slate-600 dark:border-slate-700"
                    }`}
                  >
                    Ward {w.wardNumber}
                  </button>
                ))}
              </div>
              <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Assigned categories</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {categories.data?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      categoryIds.includes(c.id)
                        ? "border-brand-navy bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/30"
                        : "border-slate-300 text-slate-600 dark:border-slate-700"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <Button disabled={assignMutation.isPending} onClick={() => assignMutation.mutate()}>
                {assignMutation.isPending ? "Saving…" : "Save assignments"}
              </Button>
            </>
          )}
        </div>
      )}
    </li>
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
