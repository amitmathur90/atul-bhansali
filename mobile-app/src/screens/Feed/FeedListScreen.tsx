import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiClient } from "../../lib/api-client";
import type { FeedStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<FeedStackParamList, "FeedList">;

const REACTION_META: Record<string, { emoji: string; label: string }> = {
  LIKE: { emoji: "👍", label: "लाइक" },
  SUPPORT: { emoji: "❤️", label: "समर्थन" },
  APPRECIATED: { emoji: "👏", label: "सराहा" },
  WOW: { emoji: "😮", label: "वाह" },
  CONCERN: { emoji: "😔", label: "चिंता" },
};
const REACTION_ORDER = ["LIKE", "SUPPORT", "APPRECIATED", "WOW", "CONCERN"];

interface FeedAuthor {
  id: string;
  name: string;
  isVerified: boolean;
  verifiedLabel?: string | null;
  profilePhotoUrl?: string | null;
}

interface FeedPost {
  id: string;
  content: string;
  mediaType: string;
  mediaUrl?: string | null;
  isPinned: boolean;
  isFeatured: boolean;
  likesCount: number;
  commentsCount: number;
  reactions: Record<string, number>;
  myReaction: string | null;
  createdAt: string;
  author: FeedAuthor;
  sharedPost?: (Pick<FeedPost, "id" | "content" | "mediaUrl" | "mediaType"> & { author: FeedAuthor }) | null;
}

export function FeedListScreen({ navigation }: Props) {
  const citizen = useAuthStore((s) => s.citizen);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [pickerForPostId, setPickerForPostId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => (await apiClient.get<{ items: FeedPost[] }>("/posts")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async (sharedPostId?: string) => {
      const form = new FormData();
      form.append("content", content || "इस पोस्ट को शेयर किया");
      if (image) form.append("image", image as unknown as Blob);
      if (sharedPostId) form.append("sharedPostId", sharedPostId);
      return (await apiClient.post("/posts", form)).data;
    },
    onSuccess: () => {
      setContent("");
      setImage(null);
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: string; type: string }) =>
      (await apiClient.post(`/posts/${postId}/react`, { type })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => apiClient.delete(`/posts/${postId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts"] }),
  });

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("अनुमति आवश्यक", "फोटो जोड़ने के लिए गैलरी एक्सेस की अनुमति दें।");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImage({ uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
    }
  }

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const reportMutation = useMutation({
    mutationFn: async () => apiClient.post(`/posts/${reportingId}/report`, { reason: reportReason }),
    onSuccess: () => {
      setReportingId(null);
      setReportReason("");
      Alert.alert("धन्यवाद", "आपकी रिपोर्ट भेज दी गई है।");
    },
  });

  function handleSharePress(post: FeedPost) {
    Alert.alert("पोस्ट शेयर करें", undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "मेरी फीड पर शेयर करें", onPress: () => createMutation.mutate(post.id) },
      { text: "अन्य ऐप में शेयर करें", onPress: () => Share.share({ message: post.content }) },
    ]);
  }

  function reactionSummary(reactions: Record<string, number>) {
    return REACTION_ORDER.filter((t) => reactions[t] > 0)
      .map((t) => `${REACTION_META[t].emoji} ${reactions[t]}`)
      .join("  ");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder="समुदाय के साथ कुछ साझा करें…"
              value={content}
              onChangeText={setContent}
              multiline
            />
            {image && <Image source={{ uri: image.uri }} style={styles.composerImage} />}
            <View style={styles.composerRow}>
              <TouchableOpacity onPress={handlePickImage} style={styles.composerImageButton}>
                <Ionicons name="image-outline" size={20} color={colors.navy} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postButton, !content.trim() && styles.postButtonDisabled]}
                disabled={!content.trim() || createMutation.isPending}
                onPress={() => createMutation.mutate(undefined)}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.postButtonText}>पोस्ट करें</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>अभी तक कोई पोस्ट नहीं है। पहली पोस्ट आप करें!</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            {item.isPinned && (
              <View style={styles.pinnedRow}>
                <Ionicons name="pin" size={12} color={colors.saffronDark} />
                <Text style={styles.pinnedText}>पिन किया गया</Text>
              </View>
            )}
            <View style={styles.postHeader}>
              <TouchableOpacity
                style={styles.authorRow}
                onPress={() => navigation.navigate("UserProfile", { citizenId: item.author.id })}
              >
                <Text style={styles.authorName}>{item.author.name}</Text>
                {item.author.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.info} />
                    <Text style={styles.verifiedText}>{item.author.verifiedLabel ?? "सत्यापित"}</Text>
                  </View>
                )}
              </TouchableOpacity>
              {item.author.id === citizen?.id ? (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert("पोस्ट हटाएं?", "यह क्रिया वापस नहीं ली जा सकती।", [
                      { text: "रद्द करें", style: "cancel" },
                      { text: "हटाएं", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                    ])
                  }
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                </TouchableOpacity>
              ) : (
                <FollowButton citizenId={item.author.id} />
              )}
            </View>
            <Text style={styles.postContent}>{item.content}</Text>
            {item.mediaUrl && item.mediaType === "IMAGE" && (
              <Image source={{ uri: item.mediaUrl }} style={styles.postImage} />
            )}

            {item.sharedPost && (
              <View style={styles.sharedPostBox}>
                <Text style={styles.sharedAuthorName}>{item.sharedPost.author.name}</Text>
                <Text style={styles.sharedContent} numberOfLines={4}>
                  {item.sharedPost.content}
                </Text>
                {item.sharedPost.mediaUrl && item.sharedPost.mediaType === "IMAGE" && (
                  <Image source={{ uri: item.sharedPost.mediaUrl }} style={styles.sharedImage} />
                )}
              </View>
            )}

            {Object.values(item.reactions).some((c) => c > 0) && (
              <Text style={styles.reactionSummary}>{reactionSummary(item.reactions)}</Text>
            )}

            {pickerForPostId === item.id && (
              <View style={styles.reactionPicker}>
                {REACTION_ORDER.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.reactionPickerItem}
                    onPress={() => {
                      reactMutation.mutate({ postId: item.id, type });
                      setPickerForPostId(null);
                    }}
                  >
                    <Text style={styles.reactionPickerEmoji}>{REACTION_META[type].emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => reactMutation.mutate({ postId: item.id, type: item.myReaction ?? "LIKE" })}
                onLongPress={() => setPickerForPostId(item.id)}
              >
                {item.myReaction ? (
                  <Text style={styles.reactionActiveEmoji}>{REACTION_META[item.myReaction].emoji}</Text>
                ) : (
                  <Ionicons name="thumbs-up-outline" size={17} color={colors.textMuted} />
                )}
                <Text style={styles.actionText}>{item.myReaction ? REACTION_META[item.myReaction].label : "रिएक्ट करें"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate("PostComments", { postId: item.id })}
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
                <Text style={styles.actionText}>{item.commentsCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleSharePress(item)}>
                <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
                <Text style={styles.actionText}>शेयर करें</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setReportingId(item.id)}>
                <Ionicons name="flag-outline" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {reportingId && (
        <View style={styles.reportOverlay}>
          <View style={styles.reportModal}>
            <Text style={styles.reportTitle}>पोस्ट रिपोर्ट करें</Text>
            <TextInput
              style={styles.reportInput}
              placeholder="कारण बताएं…"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <View style={styles.reportActions}>
              <TouchableOpacity onPress={() => setReportingId(null)}>
                <Text style={styles.reportCancel}>रद्द करें</Text>
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

function FollowButton({ citizenId }: { citizenId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["follow-info", citizenId],
    queryFn: async () => (await apiClient.get(`/citizens/${citizenId}/follow-info`)).data,
  });
  const followMutation = useMutation({
    mutationFn: async () => (await apiClient.post(`/citizens/${citizenId}/follow`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["follow-info", citizenId] }),
  });

  return (
    <TouchableOpacity
      style={[styles.followButton, data?.followedByMe && styles.followButtonActive]}
      onPress={() => followMutation.mutate()}
    >
      <Text style={[styles.followButtonText, data?.followedByMe && styles.followButtonTextActive]}>
        {data?.followedByMe ? "फॉलो कर रहे हैं" : "फॉलो करें"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  composer: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.card },
  composerInput: { fontSize: 14, color: colors.text, minHeight: 50, textAlignVertical: "top" },
  composerImage: { width: "100%", height: 160, borderRadius: radius.md, marginTop: spacing.sm },
  composerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  composerImageButton: { padding: 6 },
  postButton: { backgroundColor: colors.navy, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 8 },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  postCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.card },
  pinnedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.xs },
  pinnedText: { fontSize: 11, color: colors.saffronDark, fontWeight: "600" },
  postHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  authorName: { fontSize: 14, fontWeight: "700", color: colors.text },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  verifiedText: { fontSize: 10, color: colors.info, fontWeight: "600" },
  followButton: { borderWidth: 1, borderColor: colors.navy, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  followButtonActive: { backgroundColor: colors.navy },
  followButtonText: { fontSize: 11, fontWeight: "600", color: colors.navy },
  followButtonTextActive: { color: "#fff" },
  postContent: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  postImage: { width: "100%", height: 200, borderRadius: radius.md, marginTop: spacing.sm },
  sharedPostBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  sharedAuthorName: { fontSize: 12, fontWeight: "700", color: colors.text },
  sharedContent: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sharedImage: { width: "100%", height: 120, borderRadius: radius.sm, marginTop: spacing.xs },
  reactionSummary: { fontSize: 13, marginTop: spacing.sm, color: colors.textMuted },
  reactionPicker: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingVertical: 6,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  reactionPickerItem: { paddingHorizontal: 8 },
  reactionPickerEmoji: { fontSize: 22 },
  reactionActiveEmoji: { fontSize: 16 },
  actionRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
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
  reportCancel: { color: colors.textMuted, fontWeight: "600" },
  reportSubmit: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  reportSubmitText: { color: "#fff", fontWeight: "700" },
});
