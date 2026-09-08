import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../ui/Button";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

export interface MediaAsset {
  id: string;
  url: string;
  width: number;
  height: number;
  mimeType: string;
  createdAt: string;
}

export function MediaLibraryModal({
  onClose,
  onInsert,
  multiple = false,
}: {
  onClose: () => void;
  onInsert: (assets: MediaAsset[]) => void;
  multiple?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["media-library"],
    queryFn: async () => (await apiClient.get<{ items: MediaAsset[] }>("/media")).data.items,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("image", file);
      return (await apiClient.post<MediaAsset>("/media", form)).data;
    },
    onSuccess: (asset) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      setSelectedIds(multiple ? (prev) => new Set(prev).add(asset.id) : new Set([asset.id]));
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function toggleSelect(asset: MediaAsset) {
    setSelectedIds((prev) => {
      if (multiple) {
        const next = new Set(prev);
        if (next.has(asset.id)) next.delete(asset.id);
        else next.add(asset.id);
        return next;
      }
      return prev.has(asset.id) ? new Set() : new Set([asset.id]);
    });
  }

  const selected = data?.filter((a) => selectedIds.has(a.id)) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">मीडिया लाइब्रेरी</h2>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <UploadCloud size={14} />
              {uploadMutation.isPending ? "अपलोड हो रहा है…" : "नई इमेज अपलोड करें"}
            </Button>
            <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>
        </div>

        {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && <p className="text-sm text-slate-500">लोड हो रहा है…</p>}
          {data?.length === 0 && (
            <p className="text-sm text-slate-500">अभी तक कोई इमेज अपलोड नहीं है। ऊपर से एक अपलोड करें।</p>
          )}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {data?.map((asset) => {
              const isSelected = selectedIds.has(asset.id);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => toggleSelect(asset)}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${
                    isSelected ? "border-brand-navy" : "border-transparent hover:border-slate-300"
                  }`}
                >
                  <img src={asset.url} alt="" className="h-full w-full object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-navy/40">
                      <Check size={20} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            रद्द करें
          </Button>
          <Button disabled={selected.length === 0} onClick={() => onInsert(selected)}>
            इन्सर्ट करें{selected.length > 1 ? ` (${selected.length})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
