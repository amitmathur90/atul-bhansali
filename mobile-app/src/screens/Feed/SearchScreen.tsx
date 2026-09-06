import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import type { FeedStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<FeedStackParamList, "Search">;

interface SearchUser {
  id: string;
  name: string;
  isVerified: boolean;
  verifiedLabel?: string | null;
  profilePhotoUrl?: string | null;
}

interface SearchPost {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; isVerified: boolean };
}

interface SearchHashtag {
  tag: string;
  postsCount: number;
}

interface SearchResults {
  users: SearchUser[];
  officialAccounts: SearchUser[];
  posts: SearchPost[];
  hashtags: SearchHashtag[];
}

const TABS = [
  { key: "users", label: "यूज़र्स" },
  { key: "posts", label: "पोस्ट" },
  { key: "hashtags", label: "हैशटैग" },
  { key: "officialAccounts", label: "आधिकारिक खाते" },
] as const;

export function SearchScreen({ navigation }: Props) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("users");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["feed-search", q],
    queryFn: async () => (await apiClient.get<SearchResults>("/search", { params: { q } })).data,
    enabled: q.trim().length > 0,
  });

  function renderUser(u: SearchUser) {
    return (
      <TouchableOpacity
        key={u.id}
        style={styles.userRow}
        onPress={() => navigation.navigate("UserProfile", { citizenId: u.id })}
      >
        {u.profilePhotoUrl ? (
          <Image source={{ uri: u.profilePhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={16} color={colors.textFaint} />
          </View>
        )}
        <View style={styles.userNameCol}>
          <Text style={styles.userName}>{u.name}</Text>
          {u.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.info} />
              <Text style={styles.verifiedText}>{u.verifiedLabel ?? "सत्यापित"}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="यूज़र्स, पोस्ट, हैशटैग खोजें…"
          value={q}
          onChangeText={setQ}
          autoFocus
        />
        {isFetching && <ActivityIndicator size="small" color={colors.navy} />}
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tabButton, tab === t.key && styles.tabButtonActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!q.trim() ? (
        <Text style={styles.emptyText}>खोजने के लिए ऊपर टाइप करें।</Text>
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.navy} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={
            tab === "users"
              ? data?.users ?? []
              : tab === "officialAccounts"
                ? data?.officialAccounts ?? []
                : tab === "hashtags"
                  ? data?.hashtags ?? []
                  : data?.posts ?? []
          }
          keyExtractor={(item: any) => item.id ?? item.tag}
          ListEmptyComponent={<Text style={styles.emptyText}>कोई परिणाम नहीं मिला।</Text>}
          renderItem={({ item }: { item: any }) => {
            if (tab === "users" || tab === "officialAccounts") return renderUser(item as SearchUser);
            if (tab === "hashtags") {
              const h = item as SearchHashtag;
              return (
                <TouchableOpacity style={styles.hashtagRow} onPress={() => navigation.navigate("HashtagPosts", { tag: h.tag })}>
                  <Text style={styles.hashtagText}>#{h.tag}</Text>
                  <Text style={styles.hashtagCount}>{h.postsCount} पोस्ट</Text>
                </TouchableOpacity>
              );
            }
            const p = item as SearchPost;
            return (
              <TouchableOpacity style={styles.postRow} onPress={() => navigation.navigate("PostComments", { postId: p.id })}>
                <Text style={styles.postAuthor}>{p.author.name}</Text>
                <Text style={styles.postContent} numberOfLines={3}>
                  {p.content}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...shadow.card,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  tabRow: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  tabButton: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  tabButtonActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  tabLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  tabLabelActive: { color: "#fff" },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...shadow.card,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  userNameCol: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: colors.text },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  verifiedText: { fontSize: 10, color: colors.info, fontWeight: "600" },
  hashtagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...shadow.card,
  },
  hashtagText: { fontSize: 14, fontWeight: "700", color: colors.navy },
  hashtagCount: { fontSize: 12, color: colors.textMuted },
  postRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow.card },
  postAuthor: { fontSize: 13, fontWeight: "700", color: colors.text },
  postContent: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
