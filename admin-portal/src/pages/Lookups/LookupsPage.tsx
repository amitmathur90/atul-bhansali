import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { type Category, type Department, type Ward, useCategories, useDepartments, useWards } from "../../hooks/useLookups";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

export function LookupsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">श्रेणियां, वार्ड और विभाग</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WardsSection />
        <DepartmentsSection />
        <CategoriesSection />
      </div>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onEdit}
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-navy dark:hover:bg-slate-800"
        title="बदलें"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onDelete}
        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800"
        title="हटाएं"
      >
        <Trash2 size={14} />
      </button>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ wardNumber: string; name: string; city: string }>({
    wardNumber: "",
    name: "",
    city: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/wards", { wardNumber: Number(wardNumber), name, city }),
    onSuccess: () => {
      setWardNumber("");
      setName("");
      setCity("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.patch(`/wards/${id}`, data),
    onSuccess: () => {
      setEditingId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/wards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wards"] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function startEdit(w: Ward) {
    setEditingId(w.id);
    setEditDraft({ wardNumber: String(w.wardNumber), name: w.name, city: w.city });
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">वार्ड</h2>
      <div className="flex flex-col gap-2">
        <Input
          type="number"
          placeholder="वार्ड नंबर (जैसे 16)"
          value={wardNumber}
          onChange={(e) => setWardNumber(e.target.value)}
        />
        <Input placeholder="नाम" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="शहर" value={city} onChange={(e) => setCity(e.target.value)} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button disabled={!wardNumber || !name || !city} onClick={() => createMutation.mutate()}>
          वार्ड जोड़ें
        </Button>
      </div>
      <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
        {wards.data?.map((w) =>
          editingId === w.id ? (
            <li key={w.id} className="flex flex-col gap-1.5 border-b border-slate-100 py-2 dark:border-slate-800">
              <Input
                type="number"
                value={editDraft.wardNumber}
                onChange={(e) => setEditDraft((d) => ({ ...d, wardNumber: e.target.value }))}
              />
              <Input value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} />
              <Input value={editDraft.city} onChange={(e) => setEditDraft((d) => ({ ...d, city: e.target.value }))} />
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      id: w.id,
                      data: { wardNumber: Number(editDraft.wardNumber), name: editDraft.name, city: editDraft.city },
                    })
                  }
                >
                  <Check size={14} /> सहेजें
                </Button>
                <Button variant="ghost" onClick={() => setEditingId(null)}>
                  <X size={14} /> रद्द करें
                </Button>
              </div>
            </li>
          ) : (
            <li
              key={w.id}
              className="flex items-center justify-between border-b border-slate-100 py-1.5 dark:border-slate-800"
            >
              <span>
                वार्ड {w.wardNumber} — {w.name}, {w.city}
              </span>
              <RowActions
                onEdit={() => startEdit(w)}
                onDelete={() => {
                  if (confirm(`वार्ड ${w.wardNumber} हटाएं?`)) deleteMutation.mutate(w.id);
                }}
              />
            </li>
          ),
        )}
      </ul>
    </Card>
  );
}

function DepartmentsSection() {
  const queryClient = useQueryClient();
  const departments = useDepartments();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/departments", { name }),
    onSuccess: () => {
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.patch(`/departments/${id}`, data),
    onSuccess: () => {
      setEditingId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/departments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function startEdit(d: Department) {
    setEditingId(d.id);
    setEditName(d.name);
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">विभाग</h2>
      <div className="flex flex-col gap-2">
        <Input placeholder="विभाग का नाम" value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button disabled={!name} onClick={() => createMutation.mutate()}>
          विभाग जोड़ें
        </Button>
      </div>
      <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
        {departments.data?.map((d) =>
          editingId === d.id ? (
            <li key={d.id} className="flex items-center gap-2 border-b border-slate-100 py-1.5 dark:border-slate-800">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              <button
                onClick={() => updateMutation.mutate({ id: d.id, data: { name: editName } })}
                className="rounded p-1 text-green-600 hover:bg-green-50"
              >
                <Check size={16} />
              </button>
              <button onClick={() => setEditingId(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </li>
          ) : (
            <li
              key={d.id}
              className="flex items-center justify-between border-b border-slate-100 py-1.5 dark:border-slate-800"
            >
              <span>{d.name}</span>
              <RowActions
                onEdit={() => startEdit(d)}
                onDelete={() => {
                  if (confirm(`"${d.name}" विभाग हटाएं?`)) deleteMutation.mutate(d.id);
                }}
              />
            </li>
          ),
        )}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; departmentId: string }>({
    name: "",
    departmentId: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/categories", { name, departmentId }),
    onSuccess: () => {
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.patch(`/categories/${id}`, data),
    onSuccess: () => {
      setEditingId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditDraft({ name: c.name, departmentId: c.departmentId ?? c.department?.id ?? "" });
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">श्रेणियां</h2>
      <div className="flex flex-col gap-2">
        <Input placeholder="श्रेणी का नाम" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">विभाग चुनें…</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button disabled={!name || !departmentId} onClick={() => createMutation.mutate()}>
          श्रेणी जोड़ें
        </Button>
      </div>
      <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
        {categories.data?.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="flex flex-col gap-1.5 border-b border-slate-100 py-2 dark:border-slate-800">
              <Input
                value={editDraft.name}
                onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <Select
                value={editDraft.departmentId}
                onChange={(e) => setEditDraft((d) => ({ ...d, departmentId: e.target.value }))}
              >
                <option value="">विभाग चुनें…</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Button onClick={() => updateMutation.mutate({ id: c.id, data: editDraft })}>
                  <Check size={14} /> सहेजें
                </Button>
                <Button variant="ghost" onClick={() => setEditingId(null)}>
                  <X size={14} /> रद्द करें
                </Button>
              </div>
            </li>
          ) : (
            <li
              key={c.id}
              className="flex items-center justify-between border-b border-slate-100 py-1.5 dark:border-slate-800"
            >
              <span>
                {c.name}
                {c.department && <span className="text-xs text-slate-400"> — {c.department.name}</span>}
              </span>
              <RowActions
                onEdit={() => startEdit(c)}
                onDelete={() => {
                  if (confirm(`"${c.name}" श्रेणी निष्क्रिय करें? यह नई शिकायतों की सूची से हट जाएगी।`))
                    deactivateMutation.mutate(c.id);
                }}
              />
            </li>
          ),
        )}
      </ul>
    </Card>
  );
}
