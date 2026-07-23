import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await apiClient.get<{ items: NotificationItem[] }>("/notifications")).data.items,
  });

  async function markRead(id: string) {
    await apiClient.patch(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
      contentContainerStyle={data?.length === 0 ? styles.center : styles.listContent}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListEmptyComponent={<Text style={styles.emptyText}>अभी तक कोई सूचना नहीं है।</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, !item.isRead && styles.cardUnread]}
          onPress={() => !item.isRead && markRead(item.id)}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  emptyText: { color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  cardUnread: { borderWidth: 1, borderColor: colors.navy },
  title: { fontSize: 14, fontWeight: "700", color: colors.text },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  date: { fontSize: 11, color: colors.textFaint, marginTop: spacing.sm },
});
