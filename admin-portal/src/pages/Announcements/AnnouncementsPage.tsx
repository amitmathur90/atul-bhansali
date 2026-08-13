import { AnnouncementType } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  imageUrl?: string | null;
  isPublished: boolean;
  publishAt: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  DEVELOPMENT_PROJECT: "विकास कार्य",
  EMERGENCY_NOTICE: "आपातकालीन सूचना",
  GOVT_SCHEME: "सरकारी योजना",
  EVENT: "कार्यक्रम",
  BLOOD_DONATION: "रक्तदान",
  HEALTH_CAMP: "स्वास्थ्य शिविर",
  EMPLOYMENT_NEWS: "रोजगार समाचार",
};

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<string>(AnnouncementType.EVENT);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Announcement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await apiClient.get<{ items: Announcement[] }>("/announcements")).data.items,
  });

  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setType(AnnouncementType.EVENT);
    setImage(null);
    setImagePreview(null);
    setError(null);
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setType(a.type);
    setImage(null);
    setImagePreview(a.imageUrl ?? null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("title", title);
      form.append("body", body);
      form.append("type", type);
      if (image) form.append("image", image);
      // No explicit Content-Type — the browser sets the multipart boundary automatically.
      if (editingId) return (await apiClient.patch(`/announcements/${editingId}`, form)).data;
      return (await apiClient.post("/announcements", form)).data;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => Promise.all(ids.map((id) => apiClient.delete(`/announcements/${id}`))),
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    setSelectedIds((prev) => (prev.size === data.length ? new Set() : new Set(data.map((a) => a.id))));
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">नोटिस / घोषणा</h1>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {editingId ? "घोषणा संपादित करें" : "नई घोषणा"}
          </h2>
          {editingId && (
            <button
              onClick={resetForm}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              <X size={14} /> रद्द करें
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Input placeholder="शीर्षक" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="विवरण"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(AnnouncementType).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] ?? t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic"
              onChange={handleImageSelected}
              className="text-sm text-slate-600 dark:text-slate-300"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-md object-cover" />
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={!title || !body || saveMutation.isPending} onClick={() => saveMutation.mutate()} className="self-start">
            {saveMutation.isPending ? "सहेजा जा रहा है…" : editingId ? "अपडेट करें" : "प्रकाशित करें"}
          </Button>
        </div>
      </Card>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-brand-navy/20 bg-brand-navy/5 px-4 py-2">
          <p className="text-sm font-medium text-brand-navy">{selectedIds.size} चयनित</p>
          <div className="flex gap-2">
            <button onClick={() => setSelectedIds(new Set())} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              चयन हटाएं
            </button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`${selectedIds.size} घोषणाएं हटाएं?`)) bulkDeleteMutation.mutate(Array.from(selectedIds));
              }}
            >
              <Trash2 size={14} /> चयनित हटाएं
            </Button>
          </div>
        </div>
      )}

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
        {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई घोषणा नहीं है।</p>}
        {data && data.length > 0 && (
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
            <input
              type="checkbox"
              checked={selectedIds.size === data.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-xs text-slate-500">सभी चुनें</span>
          </div>
        )}
        <ul>
          {data?.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(a.id)}
                  onChange={() => toggleSelected(a.id)}
                  className="mt-1.5 h-4 w-4 shrink-0 rounded border-slate-300"
                />
                {a.imageUrl && (
                  <img src={a.imageUrl} alt={a.title} className="h-14 w-14 flex-shrink-0 rounded-md object-cover" />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setViewing(a)}
                      className="text-left font-medium text-slate-800 hover:text-brand-navy hover:underline dark:text-slate-100"
                    >
                      {a.title}
                    </button>
                    <Badge>{TYPE_LABELS[a.type] ?? a.type.replace(/_/g, " ")}</Badge>
                    {!a.isPublished && <Badge>ड्राफ्ट</Badge>}
                    {new Date(a.publishAt) > new Date() && <Badge>निर्धारित</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{new Date(a.publishAt).toLocaleString("hi-IN")}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => startEdit(a)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-navy dark:hover:bg-slate-800"
                  title="बदलें"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`"${a.title}" हटाएं?`)) deleteMutation.mutate(a.id);
                  }}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800"
                  title="हटाएं"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {viewing.imageUrl && (
              <img src={viewing.imageUrl} alt={viewing.title} className="h-56 w-full rounded-t-lg object-cover" />
            )}
            <div className="p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{viewing.title}</h2>
                <button
                  onClick={() => setViewing(null)}
                  className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mb-3 flex items-center gap-2">
                <Badge>{TYPE_LABELS[viewing.type] ?? viewing.type.replace(/_/g, " ")}</Badge>
                <span className="text-xs text-slate-400">{new Date(viewing.publishAt).toLocaleString("hi-IN")}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{viewing.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
