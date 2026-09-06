import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { FeedStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<FeedStackParamList, "HashtagPosts">;

interface HashtagPost {
  id: string;
  content: string;
  mediaType: string;
  mediaUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  author: { id: string; name: string; isVerified: boolean; verifiedLabel?: string | null };
}

export function HashtagPostsScreen({ route, navigation }: Props) {
  const { tag } = route.params;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["hashtag-posts", tag],
    queryFn: async () => (await apiClient.get<{ items: HashtagPost[] }>(`/hashtags/${tag}/posts`)).data.items,
  });

  return (
    <FlatList
      style={styles.container}
      data={data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>#{tag} में अभी कोई पोस्ट नहीं है।</Text> : null}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("PostComments", { postId: item.id })}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName}>{item.author.name}</Text>
            {item.author.isVerified && <Ionicons name="checkmark-circle" size={13} color={colors.info} />}
          </View>
          <Text style={styles.content} numberOfLines={4}>
            {item.content}
          </Text>
          {item.mediaUrl && item.mediaType === "IMAGE" && <Image source={{ uri: item.mediaUrl }} style={styles.image} />}
          <Text style={styles.meta}>
            ❤️ {item.likesCount}  💬 {item.commentsCount}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.card },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: { fontSize: 14, fontWeight: "700", color: colors.text },
  content: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  image: { width: "100%", height: 180, borderRadius: radius.md, marginTop: spacing.sm },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
});
