import { EmergencyContactCategory } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

interface Contact {
  id: string;
  name: string;
  category: string;
  phone: string;
  isActive: boolean;
}

export function EmergencyContactsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(EmergencyContactCategory.OTHER);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["emergency-contacts", "admin"],
    queryFn: async () => (await apiClient.get<{ items: Contact[] }>("/emergency-contacts")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () => (await apiClient.post("/emergency-contacts", { name, category, phone })).data,
    onSuccess: () => {
      setName("");
      setPhone("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/emergency-contacts/${id}`, { isActive: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Emergency Contacts</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Add contact</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.values(EmergencyContactCategory).map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button
          disabled={!name || !phone || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="mt-3"
        >
          {createMutation.isPending ? "Adding…" : "Add contact"}
        </Button>
      </Card>

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        <ul>
          {data?.map((c) => (
            <li key={c.id} className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                <p className="text-xs text-slate-500">
                  {c.category.replace(/_/g, " ")} · {c.phone}
                </p>
              </div>
              <Button variant="secondary" onClick={() => deactivateMutation.mutate(c.id)}>
                Deactivate
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
