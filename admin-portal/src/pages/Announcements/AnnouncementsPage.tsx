import { AnnouncementType } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<string>(AnnouncementType.EVENT);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await apiClient.get<{ items: Announcement[] }>("/announcements")).data.items,
  });

  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("title", title);
      form.append("body", body);
      form.append("type", type);
      if (image) form.append("image", image);
      // No explicit Content-Type — the browser sets the multipart boundary automatically.
      return (await apiClient.post("/announcements", form)).data;
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      setImage(null);
      setImagePreview(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Announcements</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">New announcement</h2>
        <div className="flex flex-col gap-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(AnnouncementType).map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
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
          <Button
            disabled={!title || !body || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="self-start"
          >
            {createMutation.isPending ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        {data?.length === 0 && <p className="p-4 text-sm text-slate-500">No announcements yet.</p>}
        <ul>
          {data?.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
              <div className="flex items-start gap-3">
                {a.imageUrl && (
                  <img src={a.imageUrl} alt={a.title} className="h-14 w-14 flex-shrink-0 rounded-md object-cover" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{a.title}</p>
                    <Badge>{a.type.replace(/_/g, " ")}</Badge>
                    {!a.isPublished && <Badge>DRAFT</Badge>}
                    {new Date(a.publishAt) > new Date() && <Badge>SCHEDULED</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(a.publishAt).toLocaleString()}</p>
                </div>
              </div>
              <Button variant="danger" onClick={() => deleteMutation.mutate(a.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
