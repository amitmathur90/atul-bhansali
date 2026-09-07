import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

interface PosterTemplate {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string;
  selfieX: number;
  selfieY: number;
  selfieSize: number;
  selfieShape: string;
  nameX: number;
  nameY: number;
  nameFontSize: number;
  nameColor: string;
  nameAlign: string;
  isActive: boolean;
  generationsCount: number;
}

interface Geometry {
  selfieX: number;
  selfieY: number;
  selfieSize: number;
  selfieShape: string;
  nameX: number;
  nameY: number;
}

const DEFAULT_GEOMETRY: Geometry = {
  selfieX: 0.5,
  selfieY: 0.28,
  selfieSize: 0.35,
  selfieShape: "circle",
  nameX: 0.5,
  nameY: 0.7,
};

const SHAPE_OPTIONS = [
  { value: "circle", label: "गोल (Circle)" },
  { value: "square", label: "चौकोर (Square)" },
  { value: "rounded", label: "गोल कोने (Rounded)" },
];

export function PosterTemplatesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["poster-templates"],
    queryFn: async () => (await apiClient.get<{ items: PosterTemplate[] }>("/poster-templates")).data.items,
  });

  const [editing, setEditing] = useState<PosterTemplate | "new" | null>(null);

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/poster-templates/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["poster-templates"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/poster-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["poster-templates"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">पोस्टर टेम्पलेट</h1>
        <Button onClick={() => setEditing("new")}>+ नया टेम्पलेट</Button>
      </div>

      {editing && (
        <TemplateEditor
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["poster-templates"] });
          }}
        />
      )}

      {isLoading && <p className="text-sm text-slate-500">लोड हो रहा है…</p>}
      {data?.length === 0 && <p className="text-sm text-slate-500">अभी तक कोई टेम्पलेट नहीं है।</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((t) => (
          <Card key={t.id} className="flex flex-col gap-2">
            <img src={t.imageUrl} alt={t.name} className="h-48 w-full rounded-md object-cover" />
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800 dark:text-slate-100">{t.name}</p>
              {!t.isActive && <Badge tone="REJECTED">निष्क्रिय</Badge>}
            </div>
            {t.category && <p className="text-xs text-slate-500">{t.category}</p>}
            <p className="text-xs text-slate-400">{t.generationsCount} बार बनाया गया</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEditing(t)}>
                बदलें
              </Button>
              <Button variant="ghost" onClick={() => toggleActiveMutation.mutate({ id: t.id, isActive: !t.isActive })}>
                {t.isActive ? "निष्क्रिय करें" : "सक्रिय करें"}
              </Button>
              <Button
                variant="danger"
                onClick={() => confirm(`"${t.name}" टेम्पलेट हटाएं?`) && deleteMutation.mutate(t.id)}
              >
                हटाएं
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: PosterTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(template?.imageUrl ?? null);
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState(template?.category ?? "");
  const [geometry, setGeometry] = useState<Geometry>(
    template
      ? {
          selfieX: template.selfieX,
          selfieY: template.selfieY,
          selfieSize: template.selfieSize,
          selfieShape: template.selfieShape,
          nameX: template.nameX,
          nameY: template.nameY,
        }
      : DEFAULT_GEOMETRY,
  );
  const [nameFontSize, setNameFontSize] = useState(template?.nameFontSize ?? 48);
  const [nameColor, setNameColor] = useState(template?.nameColor ?? "#FFFFFF");
  const [nameAlign, setNameAlign] = useState(template?.nameAlign ?? "center");
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("name", name);
      if (category) form.append("category", category);
      form.append("selfieX", String(geometry.selfieX));
      form.append("selfieY", String(geometry.selfieY));
      form.append("selfieSize", String(geometry.selfieSize));
      form.append("selfieShape", geometry.selfieShape);
      form.append("nameX", String(geometry.nameX));
      form.append("nameY", String(geometry.nameY));
      form.append("nameFontSize", String(nameFontSize));
      form.append("nameColor", nameColor);
      form.append("nameAlign", nameAlign);
      if (file) form.append("image", file);
      if (template) return apiClient.patch(`/poster-templates/${template.id}`, form);
      return apiClient.post("/poster-templates", form);
    },
    onSuccess: onSaved,
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const canSubmit = !!name && (!!template || !!file);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {template ? "टेम्पलेट संपादित करें" : "नया टेम्पलेट"}
        </h2>
        <Button variant="ghost" onClick={onClose}>
          बंद करें
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Input placeholder="टेम्पलेट का नाम" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="श्रेणी (वैकल्पिक)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">सेल्फी आकार</label>
            <div className="flex gap-2">
              {SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGeometry((g) => ({ ...g, selfieShape: opt.value }))}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                    geometry.selfieShape === opt.value
                      ? "border-brand-navy bg-brand-navy/10 text-brand-navy"
                      : "border-slate-300 text-slate-600 dark:border-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              नाम का फॉन्ट साइज़
            </label>
            <Input type="number" value={nameFontSize} onChange={(e) => setNameFontSize(Number(e.target.value))} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">रंग</label>
              <input
                type="color"
                value={nameColor}
                onChange={(e) => setNameColor(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">अलाइनमेंट</label>
              <Select value={nameAlign} onChange={(e) => setNameAlign(e.target.value)}>
                <option value="left">बाएं</option>
                <option value="center">बीच में</option>
                <option value="right">दाएं</option>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={!canSubmit || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? "सहेजा जा रहा है…" : "सहेजें"}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs text-slate-500">
            नीचे टेम्पलेट पर सेल्फी और नाम की जगह खींचकर सेट करें। सेल्फी सर्कल के कोने को खींचकर आकार बदलें।
          </p>
          {previewUrl ? (
            <PosterPositionEditor imageUrl={previewUrl} geometry={geometry} onChange={setGeometry} nameLabel="नाम यहां आएगा" />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-400">
              पहले एक इमेज चुनें
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function PosterPositionEditor({
  imageUrl,
  geometry,
  onChange,
  nameLabel,
}: {
  imageUrl: string;
  geometry: Geometry;
  onChange: (g: Geometry) => void;
  nameLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"selfie" | "selfie-resize" | "name" | null>(null);

  function relativePoint(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return { x, y };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const { x, y } = relativePoint(e.clientX, e.clientY);
    if (dragging === "selfie") {
      onChange({ ...geometry, selfieX: x, selfieY: y });
    } else if (dragging === "name") {
      onChange({ ...geometry, nameX: x, nameY: y });
    } else if (dragging === "selfie-resize") {
      const dx = x - geometry.selfieX;
      const dy = y - geometry.selfieY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      onChange({ ...geometry, selfieSize: Math.min(1, Math.max(0.05, dist * 2)) });
    }
  }

  const selfieRadiusPct = (geometry.selfieSize / 2) * 100;

  return (
    <div
      ref={containerRef}
      className="relative w-full touch-none select-none overflow-hidden rounded-md border border-slate-300"
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
    >
      <img src={imageUrl} alt="" className="pointer-events-none block w-full" draggable={false} />

      <div
        className={`absolute border-2 border-dashed border-orange-500 bg-orange-500/20 ${
          geometry.selfieShape === "circle" ? "rounded-full" : geometry.selfieShape === "rounded" ? "rounded-2xl" : ""
        }`}
        style={{
          left: `${geometry.selfieX * 100}%`,
          top: `${geometry.selfieY * 100}%`,
          width: `${selfieRadiusPct * 2}%`,
          height: `${selfieRadiusPct * 2}%`,
          transform: "translate(-50%, -50%)",
          cursor: "move",
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging("selfie");
        }}
      >
        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-blue-900">
          सेल्फी
        </div>
        <div
          className="absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-full border-2 border-white bg-orange-500"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging("selfie-resize");
          }}
        />
      </div>

      <div
        className="absolute cursor-move whitespace-nowrap rounded border-2 border-dashed border-blue-900 bg-blue-900/20 px-2 py-1 text-xs font-semibold text-blue-900"
        style={{
          left: `${geometry.nameX * 100}%`,
          top: `${geometry.nameY * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging("name");
        }}
      >
        {nameLabel}
      </div>
    </div>
  );
}
