import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useCategories, useDepartments, useWards } from "../../hooks/useLookups";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

export function LookupsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Categories, Wards & Departments</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WardsSection />
        <DepartmentsSection />
        <CategoriesSection />
      </div>
    </div>
  );
}

function WardsSection() {
  const queryClient = useQueryClient();
  const wards = useWards();
  const [wardNumber, setWardNumber] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/wards", { wardNumber: Number(wardNumber), name, city }),
    onSuccess: () => {
      setWardNumber("");
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Wards</h2>
      <div className="flex flex-col gap-2">
        <Input placeholder="Ward #" value={wardNumber} onChange={(e) => setWardNumber(e.target.value)} />
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button disabled={!wardNumber || !name || !city} onClick={() => createMutation.mutate()}>
          Add ward
        </Button>
      </div>
      <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
        {wards.data?.map((w) => (
          <li key={w.id} className="border-b border-slate-100 py-1.5 dark:border-slate-800">
            Ward {w.wardNumber} — {w.name}, {w.city}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DepartmentsSection() {
  const queryClient = useQueryClient();
  const departments = useDepartments();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/departments", { name }),
    onSuccess: () => {
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Departments</h2>
      <div className="flex flex-col gap-2">
        <Input placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button disabled={!name} onClick={() => createMutation.mutate()}>
          Add department
        </Button>
      </div>
      <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
        {departments.data?.map((d) => (
          <li key={d.id} className="border-b border-slate-100 py-1.5 dark:border-slate-800">
            {d.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CategoriesSection() {
  const queryClient = useQueryClient();
  const categories = useCategories();
  const departments = useDepartments();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/categories", { name, departmentId }),
    onSuccess: () => {
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Categories</h2>
      <div className="flex flex-col gap-2">
        <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Select department…</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button disabled={!name || !departmentId} onClick={() => createMutation.mutate()}>
          Add category
        </Button>
      </div>
      <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
        {categories.data?.map((c) => (
          <li key={c.id} className="border-b border-slate-100 py-1.5 dark:border-slate-800">
            {c.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}
