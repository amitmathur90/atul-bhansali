import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { HomeStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "DevelopmentWorkDetail">;

interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  budget: string | null;
  startDate: string | null;
  completionDate: string | null;
  ward: { name: string; wardNumber: number };
  gallery: { id: string; imageUrl: string; caption: string | null }[];
}

export function DevelopmentWorkDetailScreen({ route }: Props) {
  const { id } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ["development-project", id],
    queryFn: async () => (await apiClient.get<ProjectDetail>(`/development-projects/${id}`)).data,
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
      <Text style={styles.category}>{data.category}</Text>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.meta}>
        वार्ड {data.ward.wardNumber} — {data.ward.name} · {data.status}
      </Text>
      {data.budget && (
        <Text style={styles.meta}>बजट: ₹{Number(data.budget).toLocaleString("en-IN")}</Text>
      )}
      {data.completionDate && (
        <Text style={styles.meta}>पूर्णता: {new Date(data.completionDate).toLocaleDateString()}</Text>
      )}

      <Text style={styles.description}>{data.description}</Text>

      {data.gallery.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>तस्वीरें</Text>
          <View style={styles.gallery}>
            {data.gallery.map((g) => (
              <Image key={g.id} source={{ uri: g.imageUrl }} style={styles.thumbnail} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 60 },
  category: { fontSize: 12, fontWeight: "700", color: "#F5821F" },
  title: { fontSize: 19, fontWeight: "700", marginTop: 4 },
  meta: { fontSize: 13, color: "#666", marginTop: 4 },
  description: { fontSize: 14, color: "#333", marginTop: 16, lineHeight: 21 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 24, marginBottom: 10 },
  gallery: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbnail: { width: 90, height: 90, borderRadius: 8 },
});
