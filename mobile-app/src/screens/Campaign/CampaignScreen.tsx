import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
}

interface CampaignEvent {
  id: string;
  title: string;
  type: string;
  eventDate: string;
  location: string;
  details?: string | null;
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
  const [tab, setTab] = useState<"posts" | "events">("posts");

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

  const latestCandidate = candidate.data?.[0];
  const isRefetching = candidate.isRefetching || posts.isRefetching || events.isRefetching;

  function refetchAll() {
    candidate.refetch();
    posts.refetch();
    events.refetch();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
              <TouchableOpacity
                key={p.id}
                style={styles.postCard}
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
            );
          })
        ) : (
          <Text style={styles.emptyText}>अभी तक कोई प्रचार सामग्री नहीं है।</Text>
        ))}

      {tab === "events" &&
        (events.data?.length ? (
          events.data.map((e) => (
            <View key={e.id} style={styles.eventCard}>
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
          ))
        ) : (
          <Text style={styles.emptyText}>अभी कोई आगामी कार्यक्रम नहीं है।</Text>
        ))}
    </ScrollView>
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
  tabRow: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, ...shadow.card },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center" },
  tabButtonActive: { backgroundColor: colors.navy },
  tabLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabLabelActive: { color: "#fff" },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  postCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  postImage: { width: 56, height: 56, borderRadius: radius.md },
  postIconCircle: { width: 56, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  postTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  postBody: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  postMeta: { fontSize: 11, color: colors.saffronDark, marginTop: 4, fontWeight: "600" },
  eventCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
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
});
