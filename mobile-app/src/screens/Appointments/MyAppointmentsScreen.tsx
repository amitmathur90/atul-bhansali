import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { HomeStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<HomeStackParamList, "MyAppointments">;

interface AppointmentItem {
  id: string;
  purpose: string;
  preferredDate: string;
  status: "PENDING" | "SCHEDULED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  scheduledAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: colors.saffronDark,
  SCHEDULED: colors.info,
  COMPLETED: colors.success,
  REJECTED: colors.danger,
  CANCELLED: colors.textMuted,
};

export function MyAppointmentsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: async () =>
      (await apiClient.get<{ items: AppointmentItem[] }>("/appointments", { params: { pageSize: 50 } }))
        .data.items,
  });

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "लंबित",
    SCHEDULED: "तय हो गया",
    COMPLETED: "पूर्ण",
    REJECTED: "अस्वीकृत",
    CANCELLED: "रद्द",
  };

  const cancelMutation = useMutation({
    mutationFn: async (id: string) =>
      apiClient.patch(`/appointments/${id}/status`, { status: "CANCELLED" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-appointments"] }),
    onError: () => Alert.alert("रद्द नहीं हो सका", "कृपया पुनः प्रयास करें।"),
  });

  function confirmCancel(id: string) {
    Alert.alert("अनुरोध रद्द करें?", "इससे आपका मुलाकात अनुरोध रद्द हो जाएगा।", [
      { text: "नहीं", style: "cancel" },
      { text: "हां, रद्द करें", style: "destructive", onPress: () => cancelMutation.mutate(id) },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      contentContainerStyle={data?.length === 0 ? styles.center : styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>आपने अभी तक कोई मुलाकात अनुरोध नहीं भेजा है।</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate("BookAppointment")}>
            <Text style={styles.emptyButtonText}>मुलाकात हेतु अनुरोध करें</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.purpose}>{item.purpose}</Text>
          <Text style={styles.meta}>पसंदीदा तारीख: {new Date(item.preferredDate).toLocaleDateString()}</Text>
          {item.scheduledAt && (
            <Text style={styles.meta}>तय समय: {new Date(item.scheduledAt).toLocaleString()}</Text>
          )}
          {(item.status === "PENDING" || item.status === "SCHEDULED") && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => confirmCancel(item.id)}>
              <Text style={styles.cancelButtonText}>अनुरोध रद्द करें</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: spacing.lg, gap: spacing.md },
  emptyWrap: { alignItems: "center", gap: spacing.md },
  emptyText: { color: colors.textMuted },
  emptyButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  emptyButtonText: { color: "#fff", fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  date: { fontSize: 11, color: colors.textFaint },
  purpose: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  cancelButton: { marginTop: spacing.md, alignSelf: "flex-start" },
  cancelButtonText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
});
