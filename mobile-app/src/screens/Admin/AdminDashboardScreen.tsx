import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, shadow, spacing } from "../../theme";

interface DashboardData {
  totalComplaints: number;
  todayComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  rejectedComplaints: number;
  activeUsers: number;
  recentComplaints: {
    id: string;
    complaintNumber: string;
    category: string;
    ward: string;
    status: string;
    createdAt: string;
  }[];
}

export function AdminDashboardScreen() {
  const staff = useAuthStore((s) => s.staff);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await apiClient.get<DashboardData>("/dashboard/admin")).data,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.greeting}>नमस्ते, {staff?.name}</Text>
      <Text style={styles.role}>{staff?.role}</Text>

      {isLoading && !data && <Text style={styles.loading}>लोड हो रहा है…</Text>}

      {data && (
        <>
          <View style={styles.statGrid}>
            <StatCard label="कुल शिकायतें" value={data.totalComplaints} />
            <StatCard label="आज" value={data.todayComplaints} />
            <StatCard label="लंबित" value={data.pendingComplaints} color={colors.warning} />
            <StatCard label="हल हुई" value={data.resolvedComplaints} color={colors.success} />
            <StatCard label="अस्वीकृत" value={data.rejectedComplaints} color={colors.danger} />
            <StatCard label="सक्रिय नागरिक" value={data.activeUsers} />
          </View>

          <Text style={styles.sectionTitle}>हाल की शिकायतें</Text>
          <View style={styles.recentCard}>
            {data.recentComplaints.map((c) => (
              <View key={c.id} style={styles.recentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentNumber}>{c.complaintNumber}</Text>
                  <Text style={styles.recentMeta}>
                    {c.category} · {c.ward}
                  </Text>
                </View>
                <Text style={styles.recentStatus}>{c.status.replace("_", " ")}</Text>
              </View>
            ))}
            {data.recentComplaints.length === 0 && <Text style={styles.emptyText}>कोई शिकायत नहीं</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  greeting: { fontSize: 18, fontWeight: "700", color: colors.text },
  role: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
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
  recentCard: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.card },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentNumber: { fontSize: 13, fontWeight: "700", color: colors.text },
  recentMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  recentStatus: { fontSize: 11, fontWeight: "700", color: colors.navy },
  emptyText: { color: colors.textMuted, textAlign: "center", padding: spacing.lg },
});
