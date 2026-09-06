import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

interface FeedAnalytics {
  totalPosts: number;
  totalUsers: number;
  activeUsers: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  trendingHashtags: { tag: string; postsCount: number }[];
  mostActiveUsers: { id: string; name: string; isVerified: boolean; activityScore: number }[];
}

export function AdminFeedAnalyticsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-feed-analytics"],
    queryFn: async () => (await apiClient.get<FeedAnalytics>("/feed-analytics")).data,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {isLoading && !data && <Text style={styles.loading}>लोड हो रहा है…</Text>}
      {data && (
        <>
          <View style={styles.statGrid}>
            <Stat label="कुल पोस्ट" value={data.totalPosts} />
            <Stat label="कुल उपयोगकर्ता" value={data.totalUsers} />
            <Stat label="सक्रिय (30 दिन)" value={data.activeUsers} />
            <Stat label="कुल लाइक/रिएक्शन" value={data.totalLikes} />
            <Stat label="कुल टिप्पणियां" value={data.totalComments} />
            <Stat label="कुल शेयर" value={data.totalShares} />
          </View>

          <Text style={styles.sectionTitle}>🔥 ट्रेंडिंग हैशटैग</Text>
          <View style={styles.card}>
            {data.trendingHashtags.map((h) => (
              <View key={h.tag} style={styles.rowBetween}>
                <Text style={styles.hashtag}>#{h.tag}</Text>
                <Text style={styles.rowMeta}>{h.postsCount} पोस्ट</Text>
              </View>
            ))}
            {data.trendingHashtags.length === 0 && <Text style={styles.emptyText}>कोई हैशटैग नहीं</Text>}
          </View>

          <Text style={styles.sectionTitle}>सर्वाधिक सक्रिय उपयोगकर्ता</Text>
          <View style={styles.card}>
            {data.mostActiveUsers.map((u) => (
              <View key={u.id} style={styles.rowBetween}>
                <Text style={styles.userName}>
                  {u.name}
                  {u.isVerified ? " ✓" : ""}
                </Text>
                <Text style={styles.rowMeta}>स्कोर {u.activityScore}</Text>
              </View>
            ))}
            {data.mostActiveUsers.length === 0 && <Text style={styles.emptyText}>कोई डेटा नहीं</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  loading: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: {
    width: "31%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    ...shadow.card,
  },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  hashtag: { fontSize: 13, fontWeight: "700", color: colors.navy },
  userName: { fontSize: 13, color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textMuted },
  emptyText: { color: colors.textMuted, textAlign: "center", padding: spacing.md },
});
