import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { HashtagText } from "../../components/HashtagText";
import { ReportModal } from "../../components/ReportModal";
import { useMyIdentity } from "../../hooks/useMyIdentity";
import { apiClient } from "../../lib/api-client";
import { timeAgo } from "../../lib/timeAgo";
import type { FeedStackParamList } from "../../navigation/types";
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
const VISIBILITY_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PUBLIC: { label: "सार्वजनिक", icon: "globe-outline" },
  FOLLOWERS_ONLY: { label: "केवल फॉलोअर्स", icon: "people-outline" },
  PRIVATE: { label: "निजी", icon: "lock-closed-outline" },
};

interface FeedAuthor {
  id: string;
  name: string;
  isVerified: boolean;
  verifiedLabel?: string | null;
  profilePhotoUrl?: string | null;
}

interface FeedPoll {
  id: string;
  question: string;
  myVote: string | null;
  options: { id: string; label: string; votesCount: number }[];
}

interface FeedPost {
  id: string;
  content: string;
  mediaType: string;
  mediaUrl?: string | null;
  locationTag?: string | null;
  isPinned: boolean;
  isFeatured: boolean;
  likesCount: number;
  commentsCount: number;
  reactions: Record<string, number>;
  myReaction: string | null;
  createdAt: string;
  author: FeedAuthor;
  poll?: FeedPoll | null;
  sharedPost?: (Pick<FeedPost, "id" | "content" | "mediaUrl" | "mediaType"> & { author: FeedAuthor }) | null;
}

interface TrendingHashtag {
  tag: string;
  postsCount: number;
}

export function FeedListScreen({ navigation }: Props) {
  const myIdentity = useMyIdentity();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [pickerForPostId, setPickerForPostId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE">("PUBLIC");
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const [privatePhones, setPrivatePhones] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [localOnly, setLocalOnly] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["feed-posts", { localOnly, city: myIdentity.city }],
    queryFn: async () =>
      (
        await apiClient.get<{ items: FeedPost[] }>("/posts", {
          params: localOnly && myIdentity.city ? { city: myIdentity.city } : {},
        })
      ).data.items,
  });

  const { data: trending } = useQuery({
    queryKey: ["hashtags-trending"],
    queryFn: async () => (await apiClient.get<{ items: TrendingHashtag[] }>("/hashtags/trending")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async (sharedPostId?: string) => {
      const form = new FormData();
      form.append("content", content || "इस पोस्ट को शेयर किया");
      if (image) form.append("image", image as unknown as Blob);
      if (sharedPostId) form.append("sharedPostId", sharedPostId);
      if (!sharedPostId) {
        form.append("visibility", visibility);
        if (visibility === "PRIVATE") form.append("visibleToPhones", privatePhones);
        if (locationTag.trim()) form.append("locationTag", locationTag.trim());
        if (pollOpen && pollQuestion.trim() && pollOptions.trim()) {
          form.append("pollQuestion", pollQuestion.trim());
          form.append("pollOptions", pollOptions.trim());
        }
      }
      return (await apiClient.post("/posts", form)).data;
    },
    onSuccess: () => {
      setContent("");
      setImage(null);
      setVisibility("PUBLIC");
      setPrivatePhones("");
      setLocationTag("");
      setPollOpen(false);
      setPollQuestion("");
      setPollOptions("");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: () => Alert.alert("पोस्ट नहीं हो सकी", "कृपया विवरण जांचें और पुनः प्रयास करें।"),
  });

  const voteMutation = useMutation({
    mutationFn: async ({ postId, optionId }: { postId: string; optionId: string }) =>
      (await apiClient.post(`/posts/${postId}/poll/vote`, { optionId })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts"] }),
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

  const [viewerImage, setViewerImage] = useState<{ uri: string; authorName: string; content: string } | null>(null);

  const [reportingId, setReportingId] = useState<string | null>(null);
  const reportMutation = useMutation({
    mutationFn: async ({ reasonType, details }: { reasonType: string; details?: string }) =>
      apiClient.post(`/posts/${reportingId}/report`, { reasonType, details }),
    onSuccess: () => {
      setReportingId(null);
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

  function goToHashtag(tag: string) {
    navigation.navigate("HashtagPosts", { tag });
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
          <View>
            {!!trending?.length && (
              <View style={styles.trendingCard}>
                <Text style={styles.trendingTitle}>🔥 Trending Now</Text>
                <View style={styles.trendingChipRow}>
                  {trending.map((h) => (
                    <TouchableOpacity key={h.tag} style={styles.trendingChip} onPress={() => goToHashtag(h.tag)}>
                      <Text style={styles.trendingChipText}>#{h.tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                placeholder="समुदाय के साथ कुछ साझा करें… (#हैशटैग जोड़ें)"
                value={content}
                onChangeText={setContent}
                multiline
              />
              {image && <Image source={{ uri: image.uri }} style={styles.composerImage} />}

              <TouchableOpacity style={styles.visibilityButton} onPress={() => setVisibilityMenuOpen((o) => !o)}>
                <Ionicons name={VISIBILITY_META[visibility].icon} size={14} color={colors.navy} />
                <Text style={styles.visibilityButtonText}>{VISIBILITY_META[visibility].label}</Text>
                <Ionicons name="chevron-down" size={12} color={colors.navy} />
              </TouchableOpacity>
              {visibilityMenuOpen && (
                <View style={styles.visibilityMenu}>
                  {(["PUBLIC", "FOLLOWERS_ONLY", "PRIVATE"] as const).map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={styles.visibilityMenuItem}
                      onPress={() => {
                        setVisibility(v);
                        setVisibilityMenuOpen(false);
                      }}
                    >
                      <Ionicons name={VISIBILITY_META[v].icon} size={14} color={colors.text} />
                      <Text style={styles.visibilityMenuText}>{VISIBILITY_META[v].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {visibility === "PRIVATE" && (
                <TextInput
                  style={styles.privateInput}
                  placeholder="मोबाइल नंबर लिखें, कॉमा से अलग करें (जैसे 9876543210,9123456780)"
                  value={privatePhones}
                  onChangeText={setPrivatePhones}
                />
              )}

              <TextInput
                style={styles.locationInput}
                placeholder="📍 स्थान जोड़ें (वैकल्पिक)"
                value={locationTag}
                onChangeText={setLocationTag}
              />

              <TouchableOpacity onPress={() => setPollOpen((o) => !o)} style={styles.pollToggle}>
                <Ionicons name="bar-chart-outline" size={14} color={colors.navy} />
                <Text style={styles.pollToggleText}>{pollOpen ? "पोल हटाएं" : "पोल जोड़ें (सत्यापित खातों के लिए)"}</Text>
              </TouchableOpacity>
              {pollOpen && (
                <View style={styles.pollComposer}>
                  <TextInput
                    style={styles.input}
                    placeholder="पोल सवाल"
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="विकल्प, कॉमा से अलग करें (जैसे सड़कें,पानी,सफाई)"
                    value={pollOptions}
                    onChangeText={setPollOptions}
                  />
                </View>
              )}

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

            {myIdentity.city && (
              <View style={styles.localFilterRow}>
                <TouchableOpacity
                  style={[styles.localFilterChip, !localOnly && styles.localFilterChipActive]}
                  onPress={() => setLocalOnly(false)}
                >
                  <Text style={[styles.localFilterText, !localOnly && styles.localFilterTextActive]}>सभी पोस्ट</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.localFilterChip, localOnly && styles.localFilterChipActive]}
                  onPress={() => setLocalOnly(true)}
                >
                  <Text style={[styles.localFilterText, localOnly && styles.localFilterTextActive]}>
                    📍 मेरा क्षेत्र ({myIdentity.city})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
                {item.author.profilePhotoUrl ? (
                  <Image source={{ uri: item.author.profilePhotoUrl }} style={styles.authorAvatar} />
                ) : (
                  <View style={styles.authorAvatarPlaceholder}>
                    <Ionicons name="person" size={14} color={colors.textFaint} />
                  </View>
                )}
                <View>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorName}>{item.author.name}</Text>
                    {item.author.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.info} />
                        <Text style={styles.verifiedText}>{item.author.verifiedLabel ?? "सत्यापित"}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.postTime}>
                    {timeAgo(item.createdAt)}
                    {item.locationTag ? `  ·  📍 ${item.locationTag}` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
              {item.author.id === myIdentity.id ? (
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
            <HashtagText content={item.content} style={styles.postContent} onHashtagPress={goToHashtag} />
            {item.mediaUrl && item.mediaType === "IMAGE" && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  setViewerImage({ uri: item.mediaUrl!, authorName: item.author.name, content: item.content })
                }
              >
                <Image source={{ uri: item.mediaUrl }} style={styles.postImage} resizeMode="contain" />
              </TouchableOpacity>
            )}

            {item.sharedPost && (
              <View style={styles.sharedPostBox}>
                <Text style={styles.sharedAuthorName}>{item.sharedPost.author.name}</Text>
                <Text style={styles.sharedContent} numberOfLines={4}>
                  {item.sharedPost.content}
                </Text>
                {item.sharedPost.mediaUrl && item.sharedPost.mediaType === "IMAGE" && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      setViewerImage({
                        uri: item.sharedPost!.mediaUrl!,
                        authorName: item.sharedPost!.author.name,
                        content: item.sharedPost!.content,
                      })
                    }
                  >
                    <Image source={{ uri: item.sharedPost.mediaUrl }} style={styles.sharedImage} resizeMode="contain" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {item.poll && (
              <PollBlock poll={item.poll} onVote={(optionId) => voteMutation.mutate({ postId: item.id, optionId })} />
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
              {!myIdentity.isStaff && (
                <TouchableOpacity style={styles.actionButton} onPress={() => setReportingId(item.id)}>
                  <Ionicons name="flag-outline" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      {reportingId && (
        <ReportModal
          title="पोस्ट रिपोर्ट करें"
          submitting={reportMutation.isPending}
          onCancel={() => setReportingId(null)}
          onSubmit={(reasonType, details) => reportMutation.mutate({ reasonType, details })}
        />
      )}

      <Modal visible={!!viewerImage} transparent animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerCloseButton} onPress={() => setViewerImage(null)} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {viewerImage && (
            <>
              <Image source={{ uri: viewerImage.uri }} style={styles.viewerImage} resizeMode="contain" />
              {viewerImage.content ? (
                <ScrollView style={styles.viewerCaptionBox} contentContainerStyle={{ padding: spacing.lg }}>
                  <Text style={styles.viewerAuthorName}>{viewerImage.authorName}</Text>
                  <Text style={styles.viewerCaptionText}>{viewerImage.content}</Text>
                </ScrollView>
              ) : null}
            </>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function PollBlock({ poll, onVote }: { poll: FeedPoll; onVote: (optionId: string) => void }) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votesCount, 0);
  return (
    <View style={styles.pollBlock}>
      <Text style={styles.pollQuestion}>{poll.question}</Text>
      {poll.options.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0;
        const isMine = poll.myVote === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={styles.pollOption}
            disabled={!!poll.myVote}
            onPress={() => onVote(option.id)}
          >
            {poll.myVote && (
              <View style={[styles.pollOptionBar, { width: `${pct}%` }, isMine && styles.pollOptionBarMine]} />
            )}
            <View style={styles.pollOptionContent}>
              <Text style={[styles.pollOptionLabel, isMine && styles.pollOptionLabelMine]}>
                {isMine ? "✓ " : ""}
                {option.label}
              </Text>
              {poll.myVote && <Text style={styles.pollOptionPct}>{pct}%</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.pollTotal}>{totalVotes} वोट</Text>
    </View>
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
  trendingCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.card },
  trendingTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  trendingChipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  trendingChip: { backgroundColor: `${colors.navy}15`, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  trendingChipText: { fontSize: 12, fontWeight: "600", color: colors.navy },
  composer: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.card },
  composerInput: { fontSize: 14, color: colors.text, minHeight: 50, textAlignVertical: "top" },
  composerImage: { width: "100%", height: 160, borderRadius: radius.md, marginTop: spacing.sm },
  visibilityButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  visibilityButtonText: { fontSize: 11, color: colors.navy, fontWeight: "600" },
  visibilityMenu: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, marginTop: spacing.xs },
  visibilityMenuItem: { flexDirection: "row", alignItems: "center", gap: 6, padding: spacing.sm },
  visibilityMenuText: { fontSize: 12, color: colors.text },
  privateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  pollToggle: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm, alignSelf: "flex-start" },
  pollToggleText: { fontSize: 11, color: colors.navy, fontWeight: "600" },
  pollComposer: { gap: spacing.xs, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 12,
  },
  localFilterRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  localFilterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  localFilterChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  localFilterText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  localFilterTextActive: { color: "#fff" },
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
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  authorAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background },
  authorAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  authorNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: { fontSize: 14, fontWeight: "700", color: colors.text },
  postTime: { fontSize: 11, color: colors.textFaint, marginTop: 1 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  verifiedText: { fontSize: 10, color: colors.info, fontWeight: "600" },
  followButton: { borderWidth: 1, borderColor: colors.navy, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  followButtonActive: { backgroundColor: colors.navy },
  followButtonText: { fontSize: 11, fontWeight: "600", color: colors.navy },
  followButtonTextActive: { color: "#fff" },
  postContent: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  postImage: {
    width: "100%",
    height: 260,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    backgroundColor: colors.background,
  },
  sharedPostBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  sharedAuthorName: { fontSize: 12, fontWeight: "700", color: colors.text },
  sharedContent: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sharedImage: {
    width: "100%",
    height: 160,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
    backgroundColor: colors.background,
  },
  pollBlock: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  pollQuestion: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 2 },
  pollOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden",
    justifyContent: "center",
  },
  pollOptionBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: `${colors.navy}20`,
  },
  pollOptionBarMine: { backgroundColor: `${colors.navy}35` },
  pollOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  pollOptionLabel: { fontSize: 12, color: colors.text },
  pollOptionLabelMine: { fontWeight: "700", color: colors.navy },
  pollOptionPct: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  pollTotal: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
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
  viewerOverlay: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  viewerCloseButton: {
    position: "absolute",
    top: 48,
    right: spacing.lg,
    zIndex: 1,
    padding: spacing.xs,
  },
  viewerImage: { width: Dimensions.get("window").width, height: "70%" },
  viewerCaptionBox: { maxHeight: "25%" },
  viewerAuthorName: { color: "#fff", fontWeight: "700", fontSize: 14, marginBottom: spacing.xs },
  viewerCaptionText: { color: "#eee", fontSize: 14, lineHeight: 20 },
});
