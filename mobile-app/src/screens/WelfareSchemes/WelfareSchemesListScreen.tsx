import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { HomeStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<HomeStackParamList, "WelfareSchemesList">;

interface WelfareSchemeItem {
  id: string;
  title: string;
  description: string;
  eligibility: string;
}

export function WelfareSchemesListScreen({ navigation }: Props) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["welfare-schemes"],
    queryFn: async () =>
      (await apiClient.get<{ items: WelfareSchemeItem[] }>("/welfare-schemes")).data.items,
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
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      contentContainerStyle={data?.length === 0 ? styles.center : styles.listContent}
      ListEmptyComponent={<Text style={styles.emptyText}>अभी कोई सरकारी योजना उपलब्ध नहीं है।</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("WelfareSchemeDetail", { id: item.id })}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.eligibility} numberOfLines={1}>
            पात्रता: {item.eligibility}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: spacing.lg, gap: spacing.md },
  emptyText: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  eligibility: { fontSize: 12, color: colors.saffronDark, marginTop: spacing.sm, fontWeight: "600" },
});
