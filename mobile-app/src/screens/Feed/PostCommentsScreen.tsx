import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { apiClient } from "../../lib/api-client";
import type { FeedStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, spacing } from "../../theme";

type Props = NativeStackScreenProps<FeedStackParamList, "PostComments">;

interface CommentAuthor {
  id: string;
  name: string;
  isVerified: boolean;
  verifiedLabel?: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  likedByMe: boolean;
  citizen: CommentAuthor;
  replies: Comment[];
}

export function PostCommentsScreen({ route }: Props) {
  const { postId } = route.params;
  const citizen = useAuthStore((s) => s.citizen);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => (await apiClient.get<{ items: Comment[] }>(`/posts/${postId}/comments`)).data.items,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
    queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return apiClient.patch(`/posts/${postId}/comments/${editingId}`, { content: text });
      return apiClient.post(`/posts/${postId}/comments`, {
        content: text,
        ...(replyTo ? { parentCommentId: replyTo.id } : {}),
      });
    },
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => apiClient.delete(`/posts/${postId}/comments/${commentId}`),
    onSuccess: invalidate,
  });

  const likeMutation = useMutation({
    mutationFn: async (commentId: string) => apiClient.post(`/posts/${postId}/comments/${commentId}/like`),
    onSuccess: invalidate,
  });

  const reportMutation = useMutation({
    mutationFn: async () => apiClient.post(`/posts/${postId}/comments/${reportingId}/report`, { reason: reportReason }),
    onSuccess: () => {
      setReportingId(null);
      setReportReason("");
      Alert.alert("धन्यवाद", "आपकी रिपोर्ट भेज दी गई है।");
    },
  });

  function confirmDelete(commentId: string) {
    Alert.alert("टिप्पणी हटाएं?", undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "हटाएं", style: "destructive", onPress: () => deleteMutation.mutate(commentId) },
    ]);
  }

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setReplyTo(null);
    setText(c.content);
  }

  function renderComment(c: Comment, isReply = false) {
    return (
      <View key={c.id} style={[styles.commentRow, isReply && styles.replyRow]}>
        <View style={styles.commentBubble}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{c.citizen.name}</Text>
            {c.citizen.isVerified && <Ionicons name="checkmark-circle" size={12} color={colors.info} />}
          </View>
          <Text style={styles.commentContent}>{c.content}</Text>
        </View>
        <View style={styles.commentActions}>
          <Text style={styles.commentDate}>{new Date(c.createdAt).toLocaleDateString("hi-IN")}</Text>
          <TouchableOpacity style={styles.likeAction} onPress={() => likeMutation.mutate(c.id)}>
            <Ionicons name={c.likedByMe ? "heart" : "heart-outline"} size={12} color={c.likedByMe ? colors.danger : colors.textMuted} />
            <Text style={styles.likeActionText}>{c.likesCount}</Text>
          </TouchableOpacity>
          {!isReply && (
            <TouchableOpacity onPress={() => setReplyTo({ id: c.id, name: c.citizen.name })}>
              <Text style={styles.replyAction}>जवाब दें</Text>
            </TouchableOpacity>
          )}
          {c.citizen.id === citizen?.id ? (
            <>
              <TouchableOpacity onPress={() => startEdit(c)}>
                <Text style={styles.editAction}>संपादित करें</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(c.id)}>
                <Text style={styles.deleteAction}>हटाएं</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setReportingId(c.id)}>
              <Text style={styles.reportAction}>रिपोर्ट करें</Text>
            </TouchableOpacity>
          )}
        </View>
        {c.replies?.map((r) => renderComment(r, true))}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      {isLoading ? (
        <View style={styles.center}>
          <Text>लोड हो रहा है…</Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.emptyText}>अभी तक कोई टिप्पणी नहीं है।</Text>}
          renderItem={({ item }) => renderComment(item)}
        />
      )}

      <View style={styles.inputRow}>
        {editingId && (
          <View style={styles.replyingBanner}>
            <Text style={styles.replyingText}>टिप्पणी संपादित कर रहे हैं</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingId(null);
                setText("");
              }}
            >
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        {replyTo && !editingId && (
          <View style={styles.replyingBanner}>
            <Text style={styles.replyingText}>{replyTo.name} को जवाब दे रहे हैं</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputInner}>
          <TextInput
            style={styles.input}
            placeholder="टिप्पणी लिखें…"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            disabled={!text.trim() || submitMutation.isPending}
            onPress={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {reportingId && (
        <View style={styles.reportOverlay}>
          <View style={styles.reportModal}>
            <Text style={styles.reportTitle}>टिप्पणी रिपोर्ट करें</Text>
            <TextInput
              style={styles.reportInput}
              placeholder="कारण बताएं…"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <View style={styles.reportActions}>
              <TouchableOpacity onPress={() => setReportingId(null)}>
                <Text style={styles.replyAction}>रद्द करें</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!reportReason.trim()}
                onPress={() => reportMutation.mutate()}
                style={styles.reportSubmit}
              >
                <Text style={styles.reportSubmitText}>भेजें</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: spacing.lg, gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  commentRow: { marginBottom: spacing.sm },
  replyRow: { marginLeft: spacing.xl, marginTop: spacing.sm },
  commentBubble: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentAuthor: { fontSize: 13, fontWeight: "700", color: colors.text },
  commentContent: { fontSize: 13, color: colors.text, marginTop: 2 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: 4, marginLeft: spacing.sm, flexWrap: "wrap" },
  commentDate: { fontSize: 10, color: colors.textFaint },
  likeAction: { flexDirection: "row", alignItems: "center", gap: 2 },
  likeActionText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  replyAction: { fontSize: 11, color: colors.navy, fontWeight: "600" },
  editAction: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  deleteAction: { fontSize: 11, color: colors.danger, fontWeight: "600" },
  reportAction: { fontSize: 11, color: colors.warning, fontWeight: "600" },
  inputRow: { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, backgroundColor: colors.surface },
  replyingBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  replyingText: { fontSize: 11, color: colors.textMuted },
  inputInner: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 100,
  },
  sendButton: { backgroundColor: colors.navy, borderRadius: radius.full, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { opacity: 0.5 },
  reportOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  reportModal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: "100%" },
  reportTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  reportInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minHeight: 70,
    textAlignVertical: "top",
    fontSize: 13,
  },
  reportActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg, marginTop: spacing.md },
  reportSubmit: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  reportSubmitText: { color: "#fff", fontWeight: "700" },
});
