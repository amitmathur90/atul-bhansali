import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, Heart, MessageCircle, Pin, Star, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { apiClient } from "../../lib/api-client";

const TABS = [
  { key: "posts", label: "पोस्ट" },
  { key: "reports", label: "पोस्ट रिपोर्ट्स" },
  { key: "commentReports", label: "टिप्पणी रिपोर्ट्स" },
  { key: "verification", label: "सत्यापन अनुरोध" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FeedModerationPage() {
  const [tab, setTab] = useState<TabKey>("posts");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">सिटीज़न फ़ीड</h1>

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

      {tab === "posts" && <PostsSection />}
      {tab === "reports" && <ReportsSection />}
      {tab === "commentReports" && <CommentReportsSection />}
      {tab === "verification" && <VerificationSection />}
    </div>
  );
}

// --- Posts ---

interface FeedPost {
  id: string;
  content: string;
  mediaType: string;
  mediaUrl?: string | null;
  isPinned: boolean;
  isFeatured: boolean;
  isHidden: boolean;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  author: { id: string; name: string; isVerified: boolean; verifiedLabel?: string | null };
}

function PostsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["feed-posts-admin"],
    queryFn: async () => (await apiClient.get<{ items: FeedPost[] }>("/posts")).data.items,
  });

  const featureMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/posts/${id}/feature`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts-admin"] }),
  });
  const hideMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/posts/${id}/hide`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts-admin"] }),
  });
  const pinMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/posts/${id}/pin`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts-admin"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts-admin"] }),
  });

  return (
    <Card className="p-0">
      {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
      {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई पोस्ट नहीं है।</p>}
      <ul>
        {data?.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
            <div className="flex items-start gap-3">
              {p.mediaUrl && p.mediaType === "IMAGE" && (
                <img src={p.mediaUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-md object-cover" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{p.author.name}</p>
                  {p.author.isVerified && <Badge>✓ {p.author.verifiedLabel ?? "सत्यापित"}</Badge>}
                  {p.isPinned && <Badge>पिन किया गया</Badge>}
                  {p.isFeatured && <Badge>फीचर्ड</Badge>}
                  {p.isHidden && <Badge tone="REJECTED">छिपाया गया</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{p.content}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Heart size={12} /> {p.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={12} /> {p.commentsCount}
                  </span>
                  <span>{new Date(p.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => pinMutation.mutate(p.id)}
                className={`rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${p.isPinned ? "text-brand-navy" : "text-slate-400"}`}
                title="पिन करें"
              >
                <Pin size={15} />
              </button>
              <button
                onClick={() => featureMutation.mutate(p.id)}
                className={`rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${p.isFeatured ? "text-amber-500" : "text-slate-400"}`}
                title="फीचर करें"
              >
                <Star size={15} />
              </button>
              <button
                onClick={() => hideMutation.mutate(p.id)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title={p.isHidden ? "दिखाएं" : "छिपाएं"}
              >
                {p.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button
                onClick={() => confirm("यह पोस्ट स्थायी रूप से हटाएं?") && deleteMutation.mutate(p.id)}
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
  );
}

// --- Reports ---

interface PostReportItem {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  post: { id: string; content: string; author: { id: string; name: string } };
  reporter: { id: string; name: string; phone: string };
}

function ReportsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["post-reports"],
    queryFn: async () => (await apiClient.get<{ items: PostReportItem[] }>("/post-reports")).data.items,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "REVIEWED" | "DISMISSED" }) =>
      apiClient.patch(`/post-reports/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post-reports"] }),
  });
  const hidePostMutation = useMutation({
    mutationFn: async (postId: string) => apiClient.patch(`/posts/${postId}/hide`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post-reports"] }),
  });

  return (
    <Card className="p-0">
      {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
      {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई रिपोर्ट नहीं है।</p>}
      <ul>
        {data?.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-800 dark:text-slate-100">{r.post.author.name}</p>
                <Badge tone={r.status === "PENDING" ? "IN_PROGRESS" : r.status === "DISMISSED" ? "CANCELLED" : "COMPLETED"}>
                  {r.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.post.content}</p>
              <p className="mt-1 text-xs text-slate-500">
                <strong>कारण:</strong> {r.reason} — {r.reporter.name} द्वारा रिपोर्ट किया गया
              </p>
              <p className="mt-1 text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
            {r.status === "PENDING" && (
              <div className="flex shrink-0 flex-col gap-1">
                <Button variant="danger" onClick={() => hidePostMutation.mutate(r.post.id)}>
                  पोस्ट छिपाएं
                </Button>
                <Button variant="secondary" onClick={() => reviewMutation.mutate({ id: r.id, status: "DISMISSED" })}>
                  खारिज करें
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// --- Comment Reports ---

interface CommentReportItem {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  comment: { id: string; content: string; citizen: { id: string; name: string } };
  reporter: { id: string; name: string; phone: string };
}

function CommentReportsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["comment-reports"],
    queryFn: async () => (await apiClient.get<{ items: CommentReportItem[] }>("/comment-reports")).data.items,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "REVIEWED" | "DISMISSED" }) =>
      apiClient.patch(`/comment-reports/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comment-reports"] }),
  });

  return (
    <Card className="p-0">
      {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
      {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई रिपोर्ट नहीं है।</p>}
      <ul>
        {data?.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-800 dark:text-slate-100">{r.comment.citizen.name}</p>
                <Badge tone={r.status === "PENDING" ? "IN_PROGRESS" : r.status === "DISMISSED" ? "CANCELLED" : "COMPLETED"}>
                  {r.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.comment.content}</p>
              <p className="mt-1 text-xs text-slate-500">
                <strong>कारण:</strong> {r.reason} — {r.reporter.name} द्वारा रिपोर्ट किया गया
              </p>
              <p className="mt-1 text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
            {r.status === "PENDING" && (
              <Button variant="secondary" onClick={() => reviewMutation.mutate({ id: r.id, status: "DISMISSED" })}>
                खारिज करें
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// --- Verification Requests ---

interface VerificationRequestItem {
  id: string;
  requestedLabel: string;
  status: string;
  createdAt: string;
  citizen: { id: string; name: string; phone: string };
}

function VerificationSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["verification-requests"],
    queryFn: async () =>
      (await apiClient.get<{ items: VerificationRequestItem[] }>("/verification-requests")).data.items,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      apiClient.patch(`/verification-requests/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["verification-requests"] }),
  });

  return (
    <Card className="p-0">
      {isLoading && <p className="p-4 text-sm text-slate-500">लोड हो रहा है…</p>}
      {data?.length === 0 && <p className="p-4 text-sm text-slate-500">अभी तक कोई अनुरोध नहीं है।</p>}
      <ul>
        {data?.map((v) => (
          <li key={v.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-800 dark:text-slate-100">{v.citizen.name}</p>
                <span className="text-xs text-slate-400">{v.citizen.phone}</span>
                <Badge>{v.requestedLabel}</Badge>
                <Badge tone={v.status === "PENDING" ? "IN_PROGRESS" : v.status === "REJECTED" ? "CANCELLED" : "COMPLETED"}>
                  {v.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">{new Date(v.createdAt).toLocaleString()}</p>
            </div>
            {v.status === "PENDING" && (
              <div className="flex shrink-0 gap-2">
                <Button onClick={() => reviewMutation.mutate({ id: v.id, status: "APPROVED" })}>
                  <CheckCircle2 size={14} /> स्वीकृत करें
                </Button>
                <Button variant="danger" onClick={() => reviewMutation.mutate({ id: v.id, status: "REJECTED" })}>
                  <XCircle size={14} /> अस्वीकार करें
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
