import { DevProjectCategory, DevProjectStatus } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useWards } from "../../hooks/useLookups";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  budget: string | null;
  status: string;
  ward: { name: string; wardNumber: number };
  gallery: { id: string; imageUrl: string }[];
}

export function DevelopmentProjectsPage() {
  const queryClient = useQueryClient();
  const wards = useWards();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(DevProjectCategory.ROAD);
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [wardId, setWardId] = useState("");
  const [status, setStatus] = useState<string>(DevProjectStatus.PLANNED);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["development-projects"],
    queryFn: async () => (await apiClient.get<{ items: Project[] }>("/development-projects")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post("/development-projects", {
          title,
          category,
          description,
          budget: budget ? Number(budget) : undefined,
          wardId,
          status,
        })
      ).data,
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setBudget("");
      setWardId("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["development-projects"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/development-projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["development-projects"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Development Projects</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">New project</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.values(DevProjectCategory).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={wardId} onChange={(e) => setWardId(e.target.value)}>
            <option value="">Select ward…</option>
            {wards.data?.map((w) => (
              <option key={w.id} value={w.id}>
                Ward {w.wardNumber} — {w.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.values(DevProjectStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input placeholder="Budget (₹, optional)" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="col-span-full w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button
          disabled={!title || !description || !wardId || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="mt-3"
        >
          {createMutation.isPending ? "Creating…" : "Create project"}
        </Button>
      </Card>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {data?.length === 0 && <p className="text-sm text-slate-500">No development projects yet.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <ProjectCard key={p.id} project={p} onDelete={() => deleteMutation.mutate(p.id)} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("images", f));
      // No explicit Content-Type — the browser sets the multipart boundary automatically.
      await apiClient.post(`/development-projects/${project.id}/gallery`, form);
      queryClient.invalidateQueries({ queryKey: ["development-projects"] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{project.title}</p>
          <p className="text-xs text-slate-500">
            Ward {project.ward.wardNumber} — {project.ward.name}
          </p>
        </div>
        <Badge tone={project.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS"}>{project.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
      {project.budget && (
        <p className="mt-1 text-xs text-slate-500">Budget: ₹{Number(project.budget).toLocaleString("en-IN")}</p>
      )}

      {project.gallery.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {project.gallery.map((g) => (
            <img key={g.id} src={g.imageUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <label className="cursor-pointer text-sm text-brand-navy hover:underline">
          {uploading ? "Uploading…" : "+ Add photos"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
            disabled={uploading}
          />
        </label>
        <Button variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
