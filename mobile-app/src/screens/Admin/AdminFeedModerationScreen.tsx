import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

const REASON_LABELS: Record<string, string> = {
  SPAM: "स्पैम",
  FAKE_INFORMATION: "झूठी जानकारी",
  ABUSE: "दुर्व्यवहार",
  HATE_HARASSMENT: "नफरत / उत्पीड़न",
  INAPPROPRIATE_CONTENT: "अनुचित सामग्री",
  VIOLENCE: "हिंसा",
  OTHER: "अन्य",
};

const TABS = [
  { key: "posts", label: "पोस्ट" },
  { key: "reports", label: "पोस्ट रिपोर्ट्स" },
  { key: "commentReports", label: "टिप्पणी रिपोर्ट्स" },
  { key: "verification", label: "सत्यापन" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface WarnTarget {
  citizenId: string;
  name: string;
}

export function AdminFeedModerationScreen() {
  const [tab, setTab] = useState<TabKey>("posts");
  const [warnTarget, setWarnTarget] = useState<WarnTarget | null>(null);
  const [warnReason, setWarnReason] = useState("");

  const warnMutation = useMutation({
    mutationFn: async ({ citizenId, reason }: { citizenId: string; reason: string }) =>
      apiClient.post(`/citizens/${citizenId}/warnings`, { reason }),
    onSuccess: () => {
      setWarnTarget(null);
      setWarnReason("");
      Alert.alert("चेतावनी भेज दी गई है।");
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TABS}
        keyExtractor={(t) => t.key}
        contentContainerStyle={styles.tabRow}
        renderItem={({ item: t }) => (
          <TouchableOpacity
            style={[styles.tabButton, tab === t.key && styles.tabButtonActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        )}
      />

      {tab === "posts" && <PostsTab />}
      {tab === "reports" && <ReportsTab onWarn={setWarnTarget} />}
      {tab === "commentReports" && <CommentReportsTab onWarn={setWarnTarget} />}
      {tab === "verification" && <VerificationTab />}

      <Modal visible={!!warnTarget} transparent animationType="fade" onRequestClose={() => setWarnTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{warnTarget?.name} को चेतावनी भेजें</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="कारण लिखें"
              value={warnReason}
              onChangeText={setWarnReason}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setWarnTarget(null)}>
                <Text style={styles.modalCancel}>रद्द करें</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!warnReason.trim() || warnMutation.isPending}
                onPress={() => warnTarget && warnMutation.mutate({ citizenId: warnTarget.citizenId, reason: warnReason.trim() })}
              >
                <Text style={styles.modalSend}>भेजें</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  author: { id: string; name: string; isVerified: boolean };
}

function PostsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-feed-posts"],
    queryFn: async () => (await apiClient.get<{ items: FeedPost[] }>("/posts")).data.items,
  });

  const pinMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/posts/${id}/pin`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] }),
  });
  const featureMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/posts/${id}/feature`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] }),
  });
  const hideMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/posts/${id}/hide`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] }),
  });

  function confirmDelete(id: string) {
    Alert.alert("यह पोस्ट स्थायी रूप से हटाएं?", undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "हटाएं", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={data ?? []}
      keyExtractor={(p) => p.id}
      ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>अभी तक कोई पोस्ट नहीं है।</Text> : null}
      renderItem={({ item: p }) => (
        <View style={styles.itemCard}>
          <View style={styles.itemRow}>
            {p.mediaUrl && p.mediaType === "IMAGE" && <Image source={{ uri: p.mediaUrl }} style={styles.thumb} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemAuthor}>
                {p.author.name}
                {p.author.isVerified ? " ✓" : ""}
                {p.isPinned ? "  📌" : ""}
                {p.isFeatured ? "  ⭐" : ""}
                {p.isHidden ? "  🚫" : ""}
              </Text>
              <Text style={styles.itemContent} numberOfLines={2}>
                {p.content}
              </Text>
              <Text style={styles.itemMeta}>
                ❤️ {p.likesCount}  💬 {p.commentsCount}
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => pinMutation.mutate(p.id)} style={styles.actionBtn}>
              <Ionicons name="pin" size={16} color={p.isPinned ? colors.navy : colors.textFaint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => featureMutation.mutate(p.id)} style={styles.actionBtn}>
              <Ionicons name="star" size={16} color={p.isFeatured ? colors.warning : colors.textFaint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => hideMutation.mutate(p.id)} style={styles.actionBtn}>
              <Ionicons name={p.isHidden ? "eye" : "eye-off"} size={16} color={colors.textFaint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(p.id)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

interface PostReportItem {
  id: string;
  reasonType: string;
  details?: string | null;
  status: string;
  createdAt: string;
  post: { id: string; content: string; author: { id: string; name: string } };
  reporter: { name: string };
}

function ReportsTab({ onWarn }: { onWarn: (t: WarnTarget) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-post-reports"],
    queryFn: async () => (await apiClient.get<{ items: PostReportItem[] }>("/post-reports")).data.items,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "DISMISSED" }) =>
      apiClient.patch(`/post-reports/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-post-reports"] }),
  });
  const hidePostMutation = useMutation({
    mutationFn: async (postId: string) => apiClient.patch(`/posts/${postId}/hide`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-post-reports"] }),
  });

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={data ?? []}
      keyExtractor={(r) => r.id}
      ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>अभी तक कोई रिपोर्ट नहीं है।</Text> : null}
      renderItem={({ item: r }) => (
        <View style={styles.itemCard}>
          <Text style={styles.itemAuthor}>
            {r.post.author.name} · {r.status}
          </Text>
          <Text style={styles.itemContent} numberOfLines={2}>
            {r.post.content}
          </Text>
          <Text style={styles.itemMeta}>
            कारण: {REASON_LABELS[r.reasonType] ?? r.reasonType}
            {r.details ? ` — ${r.details}` : ""} — {r.reporter.name} द्वारा
          </Text>
          {r.status === "PENDING" && (
            <View style={styles.reportActions}>
              <TouchableOpacity style={styles.dangerBtn} onPress={() => hidePostMutation.mutate(r.post.id)}>
                <Text style={styles.dangerBtnText}>पोस्ट छिपाएं</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => onWarn({ citizenId: r.post.author.id, name: r.post.author.name })}
              >
                <Text style={styles.secondaryBtnText}>चेतावनी दें</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => reviewMutation.mutate({ id: r.id, status: "DISMISSED" })}
              >
                <Text style={styles.secondaryBtnText}>खारिज करें</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    />
  );
}

interface CommentReportItem {
  id: string;
  reasonType: string;
  details?: string | null;
  status: string;
  comment: { id: string; content: string; citizen: { id: string; name: string } };
  reporter: { name: string };
}

function CommentReportsTab({ onWarn }: { onWarn: (t: WarnTarget) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-comment-reports"],
    queryFn: async () => (await apiClient.get<{ items: CommentReportItem[] }>("/comment-reports")).data.items,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "DISMISSED" }) =>
      apiClient.patch(`/comment-reports/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-comment-reports"] }),
  });

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={data ?? []}
      keyExtractor={(r) => r.id}
      ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>अभी तक कोई रिपोर्ट नहीं है।</Text> : null}
      renderItem={({ item: r }) => (
        <View style={styles.itemCard}>
          <Text style={styles.itemAuthor}>
            {r.comment.citizen.name} · {r.status}
          </Text>
          <Text style={styles.itemContent} numberOfLines={2}>
            {r.comment.content}
          </Text>
          <Text style={styles.itemMeta}>
            कारण: {REASON_LABELS[r.reasonType] ?? r.reasonType}
            {r.details ? ` — ${r.details}` : ""} — {r.reporter.name} द्वारा
          </Text>
          {r.status === "PENDING" && (
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => onWarn({ citizenId: r.comment.citizen.id, name: r.comment.citizen.name })}
              >
                <Text style={styles.secondaryBtnText}>चेतावनी दें</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => reviewMutation.mutate({ id: r.id, status: "DISMISSED" })}
              >
                <Text style={styles.secondaryBtnText}>खारिज करें</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    />
  );
}

interface VerificationRequestItem {
  id: string;
  requestedLabel: string;
  status: string;
  citizen: { name: string; phone: string };
}

function VerificationTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-verification-requests"],
    queryFn: async () =>
      (await apiClient.get<{ items: VerificationRequestItem[] }>("/verification-requests")).data.items,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      apiClient.patch(`/verification-requests/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-verification-requests"] }),
  });

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={data ?? []}
      keyExtractor={(v) => v.id}
      ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>अभी तक कोई अनुरोध नहीं है।</Text> : null}
      renderItem={({ item: v }) => (
        <View style={styles.itemCard}>
          <Text style={styles.itemAuthor}>
            {v.citizen.name} ({v.citizen.phone}) · {v.requestedLabel} · {v.status}
          </Text>
          {v.status === "PENDING" && (
            <View style={styles.reportActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => reviewMutation.mutate({ id: v.id, status: "APPROVED" })}
              >
                <Text style={styles.saveBtnText}>स्वीकृत करें</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => reviewMutation.mutate({ id: v.id, status: "REJECTED" })}
              >
                <Text style={styles.dangerBtnText}>अस्वीकार करें</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  tabButton: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface },
  tabButtonActive: { backgroundColor: colors.navy },
  tabLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  tabLabelActive: { color: "#fff" },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  itemCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadow.card },
  itemRow: { flexDirection: "row", gap: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  itemAuthor: { fontSize: 13, fontWeight: "700", color: colors.text },
  itemContent: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  itemMeta: { fontSize: 11, color: colors.textFaint, marginTop: 4 },
  actionRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { padding: 4 },
  reportActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  dangerBtn: { backgroundColor: `${colors.danger}15`, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  dangerBtnText: { color: colors.danger, fontWeight: "700", fontSize: 12 },
  secondaryBtn: { backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  secondaryBtnText: { color: colors.text, fontWeight: "600", fontSize: 12 },
  saveBtn: { backgroundColor: `${colors.success}15`, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  saveBtnText: { color: colors.success, fontWeight: "700", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: "100%" },
  modalTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg, marginTop: spacing.md },
  modalCancel: { color: colors.textMuted, fontWeight: "600" },
  modalSend: { color: colors.navy, fontWeight: "700" },
});
