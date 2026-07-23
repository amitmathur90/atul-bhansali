import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { HomeStackParamList } from "../../navigation/types";
import { colors, radius, spacing } from "../../theme";

type Props = NativeStackScreenProps<HomeStackParamList, "WelfareSchemeDetail">;

interface WelfareSchemeDetail {
  id: string;
  title: string;
  description: string;
  eligibility: string;
  imageUrl: string | null;
}

export function WelfareSchemeDetailScreen({ route }: Props) {
  const { id } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ["welfare-scheme", id],
    queryFn: async () => (await apiClient.get<WelfareSchemeDetail>(`/welfare-schemes/${id}`)).data,
  });

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {data.imageUrl && <Image source={{ uri: data.imageUrl }} style={styles.image} />}
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.body}>{data.description}</Text>

      <View style={styles.eligibilityCard}>
        <Text style={styles.eligibilityLabel}>पात्रता</Text>
        <Text style={styles.eligibilityText}>{data.eligibility}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.xl, paddingBottom: 60 },
  image: { width: "100%", height: 180, borderRadius: radius.lg, marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  body: { fontSize: 14, color: colors.textMuted, marginTop: spacing.md, lineHeight: 21 },
  eligibilityCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.saffron,
  },
  eligibilityLabel: { fontSize: 12, fontWeight: "700", color: colors.saffronDark, textTransform: "uppercase" },
  eligibilityText: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
});
