import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

interface WelfareScheme {
  id: string;
  title: string;
  description: string;
  eligibility: string;
  isActive: boolean;
  createdAt: string;
}

export function WelfareSchemesPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["welfare-schemes"],
    queryFn: async () =>
      (await apiClient.get<{ items: WelfareScheme[] }>("/welfare-schemes")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.post("/welfare-schemes", { title, description, eligibility })).data,
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setEligibility("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["welfare-schemes"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await apiClient.patch(`/welfare-schemes/${id}`, { isActive })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["welfare-schemes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/welfare-schemes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["welfare-schemes"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Welfare Schemes</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">New scheme</h2>
        <div className="flex flex-col gap-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <textarea
            placeholder="Eligibility criteria"
            value={eligibility}
            onChange={(e) => setEligibility(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            disabled={!title || !description || !eligibility || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="self-start"
          >
            {createMutation.isPending ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        {data?.length === 0 && <p className="p-4 text-sm text-slate-500">No welfare schemes yet.</p>}
        <ul>
          {data?.map((s) => (
            <li
              key={s.id}
              className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{s.title}</p>
                  {!s.isActive && <Badge tone="CANCELLED">HIDDEN</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.description}</p>
                <p className="mt-1 text-xs text-slate-500">Eligibility: {s.eligibility}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    toggleActiveMutation.mutate({ id: s.id, isActive: !s.isActive })
                  }
                >
                  {s.isActive ? "Hide" : "Unhide"}
                </Button>
                <Button variant="danger" onClick={() => deleteMutation.mutate(s.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
