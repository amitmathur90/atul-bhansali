import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

const FIELDS: { key: string; label: string }[] = [
  { key: "contact.officeAddress", label: "Office address" },
  { key: "contact.officeHours", label: "Office hours" },
  { key: "contact.phone", label: "Phone" },
  { key: "contact.email", label: "Email" },
  { key: "contact.googleMapsUrl", label: "Google Maps URL" },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await apiClient.get<Record<string, string>>("/settings")).data,
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setValues(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => apiClient.patch("/settings", values),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Contact MLA Settings</h1>
      <Card className="max-w-lg">
        <div className="flex flex-col gap-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {f.label}
              </label>
              <Input
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-2 text-sm text-green-600">Saved</p>}
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="mt-3">
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </Card>
    </div>
  );
}
