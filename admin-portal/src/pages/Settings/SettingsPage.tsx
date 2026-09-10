import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { MediaPickerButtons } from "../../components/media/MediaPickerButtons";
import type { MediaAsset } from "../../components/media/MediaLibraryModal";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

const CANDIDATE_PHOTO_KEY = "candidate.photoUrl";

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

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("image", file);
      return (await apiClient.post<MediaAsset>("/media", form)).data;
    },
    onSuccess: (asset) => setValues((v) => ({ ...v, [CANDIDATE_PHOTO_KEY]: asset.url })),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Contact MLA Settings</h1>
      <Card className="max-w-lg">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              उम्मीदवार की फोटो (मोबाइल ऐप होम/लॉगिन स्क्रीन)
            </label>
            <div className="flex items-center gap-3">
              {values[CANDIDATE_PHOTO_KEY] && (
                <img
                  src={values[CANDIDATE_PHOTO_KEY]}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              )}
              <MediaPickerButtons
                onFile={(file) => uploadPhotoMutation.mutate(file)}
                onLibrarySelect={(asset) => setValues((v) => ({ ...v, [CANDIDATE_PHOTO_KEY]: asset.url }))}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              यह ऐप के होम स्क्रीन और लॉगिन स्क्रीन पर दिखेगी — बदलने पर ऐप का दोबारा बिल्ड बनाने की जरूरत नहीं है।
              ऐप आइकन (होम स्क्रीन पर) इससे अलग है और सिर्फ नए ऐप बिल्ड से ही बदलता है।
            </p>
          </div>

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
