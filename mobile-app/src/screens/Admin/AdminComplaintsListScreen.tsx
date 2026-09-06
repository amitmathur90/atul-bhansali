import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { AdminComplaintsStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<AdminComplaintsStackParamList, "AdminComplaintsList">;

interface ComplaintListItem {
  id: string;
  complaintNumber: string;
  title: string;
  status: string;
  priority: string;
  citizen: { name: string };
  category: { name: string };
  ward: { wardNumber: number };
  assignedStaff: { name: string } | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#64748b",
  ASSIGNED: "#2563eb",
  IN_PROGRESS: "#d97706",
  COMPLETED: "#16a34a",
  REJECTED: "#dc2626",
};

const STATUS_FILTERS = [
  { key: "", label: "सभी" },
  { key: "RECEIVED", label: "प्राप्त" },
  { key: "ASSIGNED", label: "सौंपा गया" },
  { key: "IN_PROGRESS", label: "प्रगति में" },
  { key: "COMPLETED", label: "पूर्ण" },
  { key: "REJECTED", label: "रद्द" },
];

const PAGE_SIZE = 20;

export function AdminComplaintsListScreen({ navigation }: Props) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-complaints", { status, search, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (status) params.status = status;
      if (search) params.search = search;
      return (
        await apiClient.get<{ items: ComplaintListItem[]; total: number }>("/complaints", { params })
      ).data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="शीर्षक, विवरण या शिकायत # खोजें"
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(f) => f.key}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, status === f.key && styles.filterChipActive]}
            onPress={() => {
              setStatus(f.key);
              setPage(1);
            }}
          >
            <Text style={[styles.filterLabel, status === f.key && styles.filterLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>कोई शिकायत नहीं मिली।</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("AdminComplaintDetail", { id: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.complaintNumber}>{item.complaintNumber}</Text>
              <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                  {item.status.replace("_", " ")}
                </Text>
              </View>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.meta}>
              {item.citizen.name} · {item.category.name} · वार्ड {item.ward.wardNumber}
            </Text>
            <Text style={styles.meta}>सौंपा गया: {item.assignedStaff?.name ?? "अभी नहीं"}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          data && data.total > 0 ? (
            <View style={styles.pagerRow}>
              <TouchableOpacity disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                <Text style={[styles.pagerText, page <= 1 && styles.pagerTextDisabled]}>« पिछला</Text>
              </TouchableOpacity>
              <Text style={styles.pagerText}>
                पेज {page} / {totalPages}
              </Text>
              <TouchableOpacity
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <Text style={[styles.pagerText, page >= totalPages && styles.pagerTextDisabled]}>अगला »</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchInput: {
    margin: spacing.lg,
    marginBottom: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    ...shadow.card,
  },
  filterRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.navy },
  filterLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  filterLabelActive: { color: "#fff" },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  complaintNumber: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  statusPill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 6 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  pagerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.lg },
  pagerText: { fontSize: 13, fontWeight: "600", color: colors.navy },
  pagerTextDisabled: { color: colors.textFaint },
});
