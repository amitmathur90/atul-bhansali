import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { NoticeStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<NoticeStackParamList, "AnnouncementsList">;

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  type: string;
  imageUrl?: string | null;
  publishAt: string;
}

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  DEVELOPMENT_PROJECT: { icon: "construct", color: colors.saffron },
  EMERGENCY_NOTICE: { icon: "warning", color: "#dc2626" },
  GOVT_SCHEME: { icon: "school", color: colors.navy },
  EVENT: { icon: "calendar", color: "#7c3aed" },
  BLOOD_DONATION: { icon: "water", color: "#dc2626" },
  HEALTH_CAMP: { icon: "medkit", color: "#16a34a" },
  EMPLOYMENT_NEWS: { icon: "briefcase", color: "#0284c7" },
};

export function AnnouncementsListScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await apiClient.get<{ items: AnnouncementItem[] }>("/announcements")).data.items,
  });

  const filtered = data?.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())) ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textFaint} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="सूचनाएं खोजें…"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={filtered.length === 0 ? styles.center : styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>अभी तक कोई सूचना नहीं है।</Text>}
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.EVENT;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("AnnouncementDetail", { id: item.id })}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.iconCircle, { backgroundColor: `${meta.color}20` }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.date}>{new Date(item.publishAt).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    margin: spacing.lg,
    marginBottom: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.text },
  listContent: { padding: spacing.lg, gap: spacing.md },
  emptyText: { color: colors.textMuted },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  thumbnail: { width: 48, height: 48, borderRadius: radius.md },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  date: { fontSize: 11, color: colors.textFaint, marginTop: spacing.sm },
});
