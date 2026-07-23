import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { HomeStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<HomeStackParamList, "DevelopmentWorksList">;

interface ProjectItem {
  id: string;
  title: string;
  category: string;
  status: string;
  ward: { name: string; wardNumber: number };
  gallery: { imageUrl: string }[];
}

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  ROAD: "trail-sign",
  SCHOOL: "school",
  HOSPITAL: "medkit",
  WATER: "water",
  PARK: "leaf",
  OTHER: "construct",
};

export function DevelopmentWorksListScreen({ navigation }: Props) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["development-projects"],
    queryFn: async () =>
      (await apiClient.get<{ items: ProjectItem[] }>("/development-projects")).data.items,
  });

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
      numColumns={2}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      contentContainerStyle={data?.length === 0 ? styles.center : styles.listContent}
      columnWrapperStyle={styles.row}
      ListEmptyComponent={<Text style={styles.emptyText}>अभी तक कोई विकास कार्य सूचीबद्ध नहीं है।</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("DevelopmentWorkDetail", { id: item.id })}
        >
          {item.gallery[0]?.imageUrl ? (
            <Image source={{ uri: item.gallery[0].imageUrl }} style={styles.thumbnail} />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <Ionicons name={CATEGORY_ICON[item.category] ?? "construct"} size={28} color={colors.navy} />
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: spacing.lg },
  row: { gap: spacing.md, marginBottom: spacing.md },
  emptyText: { color: colors.textMuted },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow.card,
  },
  thumbnail: { width: "100%", height: 100 },
  placeholderThumbnail: {
    width: "100%",
    height: 100,
    backgroundColor: `${colors.navy}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, fontWeight: "600", color: colors.text, padding: spacing.sm },
});
