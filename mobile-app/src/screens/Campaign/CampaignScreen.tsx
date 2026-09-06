import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { apiClient } from "../../lib/api-client";
import type { HomeStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<HomeStackParamList, "Campaign">;

interface CandidateAnnouncement {
  id: string;
  candidateName: string;
  profileImageUrl?: string | null;
  position: string;
  constituency: string;
  partyStatus: string;
  partyName?: string | null;
  message: string;
}

interface CampaignPost {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  mediaUrl?: string | null;
  publishAt: string;
  likesCount: number;
  likedByMe: boolean;
}

interface CampaignEvent {
  id: string;
  title: string;
  type: string;
  eventDate: string;
  location: string;
  details?: string | null;
  interestedCount: number;
  interestedByMe: boolean;
}

const POST_TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  POSTER: { icon: "image", label: "पोस्टर" },
  VIDEO: { icon: "videocam", label: "वीडियो" },
  ANNOUNCEMENT: { icon: "megaphone", label: "घोषणा" },
  WORK_UPDATE: { icon: "construct", label: "विकास कार्य" },
  PUBLIC_MESSAGE: { icon: "chatbubbles", label: "जनसंदेश" },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  PUBLIC_MEETING: "जनसभा",
  RALLY: "रैली",
  PROGRAM: "कार्यक्रम",
};

export function CampaignScreen({}: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"posts" | "events">("posts");
  const [feedback, setFeedback] = useState("");

  const candidate = useQuery({
    queryKey: ["candidate-announcements"],
    queryFn: async () =>
      (await apiClient.get<{ items: CandidateAnnouncement[] }>("/candidate-announcements")).data.items,
  });
  const posts = useQuery({
    queryKey: ["campaign-posts"],
    queryFn: async () => (await apiClient.get<{ items: CampaignPost[] }>("/campaign-posts")).data.items,
  });
  const events = useQuery({
    queryKey: ["campaign-events"],
    queryFn: async () => (await apiClient.get<{ items: CampaignEvent[] }>("/campaign-events")).data.items,
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => (await apiClient.post(`/campaign-posts/${postId}/like`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign-posts"] }),
  });
  const interestMutation = useMutation({
    mutationFn: async (eventId: string) => (await apiClient.post(`/campaign-events/${eventId}/interest`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign-events"] }),
  });
  const feedbackMutation = useMutation({
    mutationFn: async () => apiClient.post("/campaign-feedback", { message: feedback }),
    onSuccess: () => setFeedback(""),
  });

  const latestCandidate = candidate.data?.[0];
  const isRefetching = candidate.isRefetching || posts.isRefetching || events.isRefetching;

  function refetchAll() {
    candidate.refetch();
    posts.refetch();
    events.refetch();
  }

  function shareText(title: string, message: string) {
    Share.share({ message: `${title}\n\n${message}` });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchAll} />}
      >
        {latestCandidate && (
          <View style={styles.candidateCard}>
            {latestCandidate.profileImageUrl && (
              <Image source={{ uri: latestCandidate.profileImageUrl }} style={styles.candidatePhoto} />
            )}
            <Text style={styles.candidateName}>{latestCandidate.candidateName}</Text>
            <Text style={styles.candidateMeta}>
              {latestCandidate.position} • {latestCandidate.constituency}
            </Text>
            <Text style={styles.candidateParty}>
              {latestCandidate.partyStatus === "INDEPENDENT" ? "निर्दलीय" : latestCandidate.partyName ?? "पार्टी"}
            </Text>
            <Text style={styles.candidateMessage}>{latestCandidate.message}</Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => shareText(latestCandidate.candidateName, latestCandidate.message)}
            >
              <Ionicons name="share-social" size={14} color={colors.navy} />
              <Text style={styles.shareButtonText}>शेयर करें</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, tab === "posts" && styles.tabButtonActive]}
            onPress={() => setTab("posts")}
          >
            <Text style={[styles.tabLabel, tab === "posts" && styles.tabLabelActive]}>प्रचार सामग्री</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === "events" && styles.tabButtonActive]}
            onPress={() => setTab("events")}
          >
            <Text style={[styles.tabLabel, tab === "events" && styles.tabLabelActive]}>अभियान कार्यक्रम</Text>
          </TouchableOpacity>
        </View>

        {tab === "posts" &&
          (posts.data?.length ? (
            posts.data.map((p) => {
              const meta = POST_TYPE_META[p.type] ?? POST_TYPE_META.ANNOUNCEMENT;
              return (
                <View key={p.id} style={styles.postCard}>
                  <TouchableOpacity
                    style={styles.postMainRow}
                    onPress={() => p.type === "VIDEO" && p.mediaUrl && Linking.openURL(p.mediaUrl)}
                    disabled={p.type !== "VIDEO"}
                  >
                    {p.mediaUrl && p.type !== "VIDEO" ? (
                      <Image source={{ uri: p.mediaUrl }} style={styles.postImage} />
                    ) : (
                      <View style={[styles.postIconCircle, { backgroundColor: `${colors.saffron}20` }]}>
                        <Ionicons name={meta.icon} size={20} color={colors.saffron} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.postTitle}>{p.title}</Text>
                      {p.description && (
                        <Text style={styles.postBody} numberOfLines={2}>
                          {p.description}
                        </Text>
                      )}
                      <Text style={styles.postMeta}>{meta.label}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => likeMutation.mutate(p.id)}>
                      <Ionicons
                        name={p.likedByMe ? "heart" : "heart-outline"}
                        size={18}
                        color={p.likedByMe ? colors.danger : colors.textMuted}
                      />
                      <Text style={styles.actionText}>{p.likesCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => shareText(p.title, p.description ?? p.mediaUrl ?? "")}
                    >
                      <Ionicons name="share-social-outline" size={17} color={colors.textMuted} />
                      <Text style={styles.actionText}>शेयर करें</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>अभी तक कोई प्रचार सामग्री नहीं है।</Text>
          ))}

        {tab === "events" &&
          (events.data?.length ? (
            events.data.map((e) => (
              <View key={e.id} style={styles.eventCard}>
                <View style={styles.eventMainRow}>
                  <View style={styles.eventDateBadge}>
                    <Text style={styles.eventDateDay}>{new Date(e.eventDate).getDate()}</Text>
                    <Text style={styles.eventDateMonth}>
                      {new Date(e.eventDate).toLocaleDateString("hi-IN", { month: "short" })}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postTitle}>{e.title}</Text>
                    <Text style={styles.postMeta}>{EVENT_TYPE_LABELS[e.type] ?? e.type}</Text>
                    <Text style={styles.eventLocation}>📍 {e.location}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(e.eventDate).toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => interestMutation.mutate(e.id)}>
                    <Ionicons
                      name={e.interestedByMe ? "star" : "star-outline"}
                      size={17}
                      color={e.interestedByMe ? colors.warning : colors.textMuted}
                    />
                    <Text style={styles.actionText}>
                      {e.interestedByMe ? "रुचि दर्ज है" : "रुचि दिखाएं"} ({e.interestedCount})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>अभी कोई आगामी कार्यक्रम नहीं है।</Text>
          ))}

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackLabel}>फीडबैक या सवाल भेजें</Text>
          <TextInput
            style={styles.feedbackInput}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="अपना संदेश यहाँ लिखें…"
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.feedbackButton, !feedback.trim() && styles.feedbackButtonDisabled]}
            disabled={!feedback.trim() || feedbackMutation.isPending}
            onPress={() => feedbackMutation.mutate()}
          >
            {feedbackMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.feedbackButtonText}>भेजें</Text>
            )}
          </TouchableOpacity>
          {feedbackMutation.isSuccess && <Text style={styles.feedbackSuccess}>धन्यवाद! आपका संदेश भेज दिया गया।</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  candidateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadow.card,
  },
  candidatePhoto: { width: 72, height: 72, borderRadius: 36, marginBottom: spacing.sm },
  candidateName: { fontSize: 17, fontWeight: "700", color: colors.text },
  candidateMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  candidateParty: { fontSize: 12, fontWeight: "600", color: colors.saffronDark, marginTop: 4 },
  candidateMessage: { fontSize: 13, color: colors.text, marginTop: spacing.sm, textAlign: "center" },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.navy,
  },
  shareButtonText: { fontSize: 12, fontWeight: "600", color: colors.navy },
  tabRow: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, ...shadow.card },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center" },
  tabButtonActive: { backgroundColor: colors.navy },
  tabLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabLabelActive: { color: "#fff" },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  postCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  postMainRow: { flexDirection: "row", gap: spacing.md },
  postImage: { width: 56, height: 56, borderRadius: radius.md },
  postIconCircle: { width: 56, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  postTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  postBody: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  postMeta: { fontSize: 11, color: colors.saffronDark, marginTop: 4, fontWeight: "600" },
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
  eventCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  eventMainRow: { flexDirection: "row", gap: spacing.md },
  eventDateBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: `${colors.navy}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  eventDateDay: { fontSize: 18, fontWeight: "700", color: colors.navy },
  eventDateMonth: { fontSize: 11, color: colors.navy },
  eventLocation: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  eventTime: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  feedbackCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  feedbackLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  feedbackInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: "top",
    minHeight: 70,
  },
  feedbackButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  feedbackButtonDisabled: { opacity: 0.5 },
  feedbackButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  feedbackSuccess: { fontSize: 12, color: colors.success, marginTop: spacing.sm, textAlign: "center" },
});
