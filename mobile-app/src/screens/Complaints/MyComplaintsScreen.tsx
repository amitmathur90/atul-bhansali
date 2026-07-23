import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { MyTicketsStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<MyTicketsStackParamList, "MyComplaints">;

interface ComplaintListItem {
  id: string;
  complaintNumber: string;
  title: string;
  status: string;
  priority: string;
  address: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#64748b",
  ASSIGNED: "#2563eb",
  IN_PROGRESS: "#d97706",
  COMPLETED: "#16a34a",
  REJECTED: "#dc2626",
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "प्राप्त हुई",
  ASSIGNED: "सौंपा गया",
  IN_PROGRESS: "प्रगति में",
  COMPLETED: "पूर्ण",
  REJECTED: "रद्द",
};

type FilterKey = "ALL" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "सभी" },
  { key: "IN_PROGRESS", label: "प्रगति में" },
  { key: "COMPLETED", label: "पूर्ण" },
  { key: "REJECTED", label: "रद्द" },
];

function matchesFilter(status: string, filter: FilterKey) {
  if (filter === "ALL") return true;
  if (filter === "IN_PROGRESS") return status === "RECEIVED" || status === "ASSIGNED" || status === "IN_PROGRESS";
  return status === filter;
}

export function MyComplaintsScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["my-complaints"],
    queryFn: async () =>
      (await apiClient.get<{ items: ComplaintListItem[] }>("/complaints", { params: { pageSize: 50 } }))
        .data.items,
  });

  const filtered = data?.filter((item) => matchesFilter(item.status, filter)) ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={filtered.length === 0 ? styles.center : styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>इस श्रेणी में कोई शिकायत नहीं है।</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("ComplaintDetail", { id: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.complaintNumber}>{item.complaintNumber}</Text>
              <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              📍 {item.address}
            </Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  filterChipActive: { backgroundColor: colors.navy },
  filterLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  filterLabelActive: { color: "#fff" },
  listContent: { padding: spacing.lg, gap: spacing.md },
  emptyText: { color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card, marginBottom: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  complaintNumber: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  statusPill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 6 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  date: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
});
