import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { NoticeStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<NoticeStackParamList, "AnnouncementDetail">;

interface AnnouncementDetail {
  id: string;
  title: string;
  body: string;
  type: string;
  imageUrl: string | null;
  publishAt: string;
}

export function AnnouncementDetailScreen({ route }: Props) {
  const { id } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ["announcement", id],
    queryFn: async () => (await apiClient.get<AnnouncementDetail>(`/announcements/${id}`)).data,
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
      <Text style={styles.type}>{data.type.replace(/_/g, " ")}</Text>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.date}>{new Date(data.publishAt).toLocaleString()}</Text>
      <Text style={styles.body}>{data.body}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 60 },
  image: { width: "100%", height: 180, borderRadius: 10, marginBottom: 16 },
  type: { fontSize: 12, fontWeight: "700", color: "#F5821F" },
  title: { fontSize: 19, fontWeight: "700", marginTop: 4 },
  date: { fontSize: 12, color: "#999", marginTop: 6 },
  body: { fontSize: 14, color: "#333", marginTop: 16, lineHeight: 21 },
});
