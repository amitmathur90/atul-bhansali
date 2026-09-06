import { CampaignEventType, CampaignPostType, PartyStatus } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, Pencil, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { apiClient } from "../../lib/api-client";
import { extractErrorMessage } from "../../lib/errors";

const TABS = [
  { key: "candidate", label: "उम्मीदवार घोषणा" },
  { key: "posts", label: "प्रचार सामग्री" },
  { key: "events", label: "अभियान कार्यक्रम" },
  { key: "feedback", label: "फीडबैक" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CampaignPage() {
  const [tab, setTab] = useState<TabKey>("candidate");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">चुनाव अभियान और प्रचार</h1>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "candidate" && <CandidateAnnouncementsSection />}
      {tab === "posts" && <CampaignPostsSection />}
      {tab === "events" && <CampaignEventsSection />}
      {tab === "feedback" && <CampaignFeedbackSection />}
    </div>
  );
}

// --- Candidate Announcement ---

interface CandidateAnnouncement {
  id: string;
  candidateName: string;
  profileImageUrl?: string | null;
  position: string;
  constituency: string;
  partyStatus: string;
  partyName?: string | null;
  message: string;
  isPublished: boolean;
  publishAt: string;
}

function CandidateAnnouncementsSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [position, setPosition] = useState("");
  const [constituency, setConstituency] = useState("");
  const [partyStatus, setPartyStatus] = useState<string>(PartyStatus.PARTY);
  const [partyName, setPartyName] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["candidate-announcements"],
    queryFn: async () =>
      (await apiClient.get<{ items: CandidateAnnouncement[] }>("/candidate-announcements")).data.items,
  });

  function resetForm() {
    setEditingId(null);
    setCandidateName("");
    setPosition("");
    setConstituency("");
    setPartyStatus(PartyStatus.PARTY);
    setPartyName("");
    setMessage("");
    setImage(null);
    setImagePreview(null);
    setError(null);
  }

  function startEdit(a: CandidateAnnouncement) {
    setEditingId(a.id);
    setCandidateName(a.candidateName);
    setPosition(a.position);
    setConstituency(a.constituency);
    setPartyStatus(a.partyStatus);
    setPartyName(a.partyName ?? "");
    setMessage(a.message);
    setImage(null);
    setImagePreview(a.profileImageUrl ?? null);
    setError(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("candidateName", candidateName);
      form.append("position", position);
      form.append("constituency", constituency);
      form.append("partyStatus", partyStatus);
      if (partyName) form.append("partyName", partyName);
      form.append("message", message);
      if (image) form.append("image", image);
      if (editingId) return (await apiClient.patch(`/candidate-announcements/${editingId}`, form)).data;
      return (await apiClient.post("/candidate-announcements", form)).data;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["candidate-announcements"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/candidate-announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate-announcements"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {editingId ? "घोषणा संपादित करें" : "नई उम्मीदवार घोषणा"}
          </h2>
          {editingId && (
            <button onClick={resetForm} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
              <X size={14} /> रद्द करें
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Input placeholder="उम्मीदवार का नाम" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
          <Input placeholder="पद (जैसे MLA, MP)" value={position} onChange={(e) => setPosition(e.target.value)} />
          <Input placeholder="निर्वाचन क्षेत्र" value={constituency} onChange={(e) => setConstituency(e.target.value)} />
          <Select value={partyStatus} onChange={(e) => setPartyStatus(e.target.value)}>
            <option value={PartyStatus.PARTY}>पार्टी</option>
            <option value={PartyStatus.INDEPENDENT}>निर्दलीय</option>
          </Select>
          {partyStatus === PartyStatus.PARTY && (
            <Input placeholder="पार्टी का नाम" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
          )}
        </div>
        <textarea
          placeholder="घोषणा संदेश"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <div className="mt-3 flex items-center gap-3">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setImage(file);
              setImagePreview(file ? URL.createObjectURL(file) : null);
            }}
            className="text-sm text-slate-600 dark:text-slate-300"
          />
          {imagePreview && <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-full object-cover" />}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button
          disabled={!candidateName || !position || !constituency || !message || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="mt-3"
        >
          {saveMutation.isPending ? "सहेजा जा रहा है…" : editingId ? "अपडेट करें" : "प्रकाशित करें"}
        </Button>
      </Card>

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
        {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई घोषणा नहीं है।</p>}
        <ul>
          {data?.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
              <div className="flex items-start gap-3">
                {a.profileImageUrl && (
                  <img src={a.profileImageUrl} alt={a.candidateName} className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{a.candidateName}</p>
                    <Badge>{a.position}</Badge>
                    <Badge>{a.partyStatus === PartyStatus.INDEPENDENT ? "निर्दलीय" : a.partyName || "पार्टी"}</Badge>
                    {!a.isPublished && <Badge>ड्राफ्ट</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{a.constituency}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.message}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => startEdit(a)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-navy dark:hover:bg-slate-800" title="बदलें">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => confirm(`"${a.candidateName}" की घोषणा हटाएं?`) && deleteMutation.mutate(a.id)}
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
    </div>
  );
}

// --- Campaign Promotion Posts ---

interface CampaignPost {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  mediaUrl?: string | null;
  isPublished: boolean;
  publishAt: string;
  likesCount: number;
}

const POST_TYPE_LABELS: Record<string, string> = {
  POSTER: "पोस्टर",
  VIDEO: "वीडियो",
  ANNOUNCEMENT: "घोषणा",
  WORK_UPDATE: "विकास कार्य अपडेट",
  PUBLIC_MESSAGE: "जनसंदेश",
};

function CampaignPostsSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<string>(CampaignPostType.POSTER);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["campaign-posts"],
    queryFn: async () => (await apiClient.get<{ items: CampaignPost[] }>("/campaign-posts")).data.items,
  });

  function resetForm() {
    setEditingId(null);
    setType(CampaignPostType.POSTER);
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setImage(null);
    setImagePreview(null);
    setError(null);
  }

  function startEdit(p: CampaignPost) {
    setEditingId(p.id);
    setType(p.type);
    setTitle(p.title);
    setDescription(p.description ?? "");
    setVideoUrl(p.type === CampaignPostType.VIDEO ? p.mediaUrl ?? "" : "");
    setImage(null);
    setImagePreview(p.type !== CampaignPostType.VIDEO ? p.mediaUrl ?? null : null);
    setError(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("type", type);
      form.append("title", title);
      if (description) form.append("description", description);
      if (type === CampaignPostType.VIDEO && videoUrl) form.append("mediaUrl", videoUrl);
      if (image) form.append("image", image);
      if (editingId) return (await apiClient.patch(`/campaign-posts/${editingId}`, form)).data;
      return (await apiClient.post("/campaign-posts", form)).data;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["campaign-posts"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/campaign-posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign-posts"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {editingId ? "पोस्ट संपादित करें" : "नई प्रचार पोस्ट"}
          </h2>
          {editingId && (
            <button onClick={resetForm} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
              <X size={14} /> रद्द करें
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(CampaignPostType).map((t) => (
              <option key={t} value={t}>
                {POST_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Input placeholder="शीर्षक" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="विवरण (वैकल्पिक)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          {type === CampaignPostType.VIDEO ? (
            <Input
              placeholder="वीडियो URL (YouTube/Vimeo लिंक)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImage(file);
                  setImagePreview(file ? URL.createObjectURL(file) : null);
                }}
                className="text-sm text-slate-600 dark:text-slate-300"
              />
              {imagePreview && <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-md object-cover" />}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={!title || saveMutation.isPending} onClick={() => saveMutation.mutate()} className="self-start">
            {saveMutation.isPending ? "सहेजा जा रहा है…" : editingId ? "अपडेट करें" : "प्रकाशित करें"}
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
        {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई पोस्ट नहीं है।</p>}
        <ul>
          {data?.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
              <div className="flex items-start gap-3">
                {p.mediaUrl && p.type !== CampaignPostType.VIDEO && (
                  <img src={p.mediaUrl} alt={p.title} className="h-14 w-14 flex-shrink-0 rounded-md object-cover" />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{p.title}</p>
                    <Badge>{POST_TYPE_LABELS[p.type] ?? p.type}</Badge>
                    {!p.isPublished && <Badge>ड्राफ्ट</Badge>}
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Heart size={12} /> {p.likesCount}
                    </span>
                  </div>
                  {p.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{p.description}</p>}
                  {p.type === CampaignPostType.VIDEO && p.mediaUrl && (
                    <a href={p.mediaUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-brand-navy hover:underline">
                      {p.mediaUrl}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => startEdit(p)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-navy dark:hover:bg-slate-800" title="बदलें">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => confirm(`"${p.title}" हटाएं?`) && deleteMutation.mutate(p.id)}
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
    </div>
  );
}

// --- Campaign Events ---

interface CampaignEvent {
  id: string;
  title: string;
  type: string;
  eventDate: string;
  location: string;
  details?: string | null;
  isActive: boolean;
  interestedCount: number;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  PUBLIC_MEETING: "जनसभा",
  RALLY: "रैली",
  PROGRAM: "कार्यक्रम",
};

function CampaignEventsSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>(CampaignEventType.PUBLIC_MEETING);
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["campaign-events"],
    queryFn: async () => (await apiClient.get<{ items: CampaignEvent[] }>("/campaign-events")).data.items,
  });

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setType(CampaignEventType.PUBLIC_MEETING);
    setEventDate("");
    setLocation("");
    setDetails("");
    setError(null);
  }

  function startEdit(e: CampaignEvent) {
    setEditingId(e.id);
    setTitle(e.title);
    setType(e.type);
    setEventDate(e.eventDate.slice(0, 16));
    setLocation(e.location);
    setDetails(e.details ?? "");
    setError(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { title, type, eventDate, location, details: details || undefined };
      if (editingId) return (await apiClient.patch(`/campaign-events/${editingId}`, payload)).data;
      return (await apiClient.post("/campaign-events", payload)).data;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["campaign-events"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await apiClient.patch(`/campaign-events/${id}`, { isActive })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign-events"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/campaign-events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign-events"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {editingId ? "कार्यक्रम संपादित करें" : "नया अभियान कार्यक्रम"}
          </h2>
          {editingId && (
            <button onClick={resetForm} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
              <X size={14} /> रद्द करें
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Input placeholder="शीर्षक" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(CampaignEventType).map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          <Input placeholder="स्थान" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <textarea
          placeholder="विवरण (वैकल्पिक)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={2}
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button
          disabled={!title || !eventDate || !location || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="mt-3"
        >
          {saveMutation.isPending ? "सहेजा जा रहा है…" : editingId ? "अपडेट करें" : "प्रकाशित करें"}
        </Button>
      </Card>

      <Card className="p-0">
        {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
        {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई कार्यक्रम नहीं है।</p>}
        <ul>
          {data?.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{e.title}</p>
                  <Badge>{EVENT_TYPE_LABELS[e.type] ?? e.type}</Badge>
                  {!e.isActive && <Badge>निष्क्रिय</Badge>}
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Star size={12} /> {e.interestedCount} रुचि
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(e.eventDate).toLocaleString("hi-IN")} • {e.location}
                </p>
                {e.details && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{e.details}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="secondary" onClick={() => toggleActiveMutation.mutate({ id: e.id, isActive: !e.isActive })}>
                  {e.isActive ? "छिपाएं" : "सक्रिय करें"}
                </Button>
                <button onClick={() => startEdit(e)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-navy dark:hover:bg-slate-800" title="बदलें">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => confirm(`"${e.title}" हटाएं?`) && deleteMutation.mutate(e.id)}
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
    </div>
  );
}

// --- Citizen Feedback / Engagement ---

interface CampaignFeedbackItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  citizen: { name: string; phone: string };
}

function CampaignFeedbackSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-feedback"],
    queryFn: async () =>
      (await apiClient.get<{ items: CampaignFeedbackItem[] }>("/campaign-feedback")).data.items,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/campaign-feedback/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign-feedback"] }),
  });

  return (
    <Card className="p-0">
      {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
      {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई फीडबैक नहीं है।</p>}
      <ul>
        {data?.map((f) => (
          <li
            key={f.id}
            className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800"
          >
            <div className="flex items-start gap-3">
              <MessageSquare size={16} className="mt-1 shrink-0 text-slate-400" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{f.citizen.name}</p>
                  <span className="text-xs text-slate-400">{f.citizen.phone}</span>
                  {!f.isRead && <Badge>नया</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{f.message}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(f.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {!f.isRead && (
              <Button variant="secondary" onClick={() => markReadMutation.mutate(f.id)}>
                देखा गया चिह्नित करें
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
