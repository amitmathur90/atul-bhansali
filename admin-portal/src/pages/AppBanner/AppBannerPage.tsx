import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

interface AppBanner {
  id: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

export function AppBannerPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["app-banners"],
    queryFn: async () => (await apiClient.get<{ items: AppBanner[] }>("/app-banners")).data.items,
  });

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("isActive", "true");
      form.append("image", file!);
      return apiClient.post("/app-banners", form);
    },
    onSuccess: () => {
      setFile(null);
      setPreviewUrl(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["app-banners"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/app-banners/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-banners"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/app-banners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-banners"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">ऐप पॉपअप बैनर</h1>
        <p className="mt-1 text-sm text-slate-500">
          यह इमेज ऐप खोलते ही सबसे पहले पूरी स्क्रीन पर पॉपअप की तरह दिखेगी, लॉगिन स्क्रीन से पहले। एक समय में केवल एक
          बैनर सक्रिय रह सकता है।
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">नया बैनर अपलोड करें</h2>
        <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
        {previewUrl && <img src={previewUrl} alt="" className="h-64 w-full rounded-md object-contain bg-slate-100" />}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <Button disabled={!file || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
            {uploadMutation.isPending ? "अपलोड हो रहा है…" : "अपलोड करें और सक्रिय करें"}
          </Button>
        </div>
      </Card>

      {isLoading && <p className="text-sm text-slate-500">लोड हो रहा है…</p>}
      {data?.length === 0 && <p className="text-sm text-slate-500">अभी तक कोई बैनर अपलोड नहीं किया गया।</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((b) => (
          <Card key={b.id} className="flex flex-col gap-2">
            <img src={b.imageUrl} alt="" className="h-48 w-full rounded-md object-contain bg-slate-100" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">{new Date(b.createdAt).toLocaleString("hi-IN")}</p>
              {b.isActive ? <Badge tone="APPROVED">सक्रिय</Badge> : <Badge tone="REJECTED">निष्क्रिय</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {!b.isActive && (
                <Button variant="secondary" onClick={() => toggleActiveMutation.mutate({ id: b.id, isActive: true })}>
                  सक्रिय करें
                </Button>
              )}
              {b.isActive && (
                <Button variant="ghost" onClick={() => toggleActiveMutation.mutate({ id: b.id, isActive: false })}>
                  निष्क्रिय करें
                </Button>
              )}
              <Button variant="danger" onClick={() => confirm("यह बैनर हटाएं?") && deleteMutation.mutate(b.id)}>
                हटाएं
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
