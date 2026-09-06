import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMyIdentity } from "../../hooks/useMyIdentity";
import { apiClient } from "../../lib/api-client";
import type { FeedStackParamList } from "../../navigation/types";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<FeedStackParamList, "UserProfile">;

interface Profile {
  id: string;
  name: string;
  bio?: string | null;
  city?: string | null;
  profilePhotoUrl?: string | null;
  isVerified: boolean;
  verifiedLabel?: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  badges: { key: string; emoji: string; label: string }[];
}

interface Analytics {
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  followersCount: number;
  topPost: { id: string; content: string; likesCount: number } | null;
}

interface ProfilePost {
  id: string;
  content: string;
  mediaType: string;
  mediaUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export function UserProfileScreen({ route, navigation }: Props) {
  const { citizenId } = route.params;
  const myIdentity = useMyIdentity();
  const isOwnProfile = myIdentity.id === citizenId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"posts" | "media" | "about">("posts");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", citizenId],
    queryFn: async () => (await apiClient.get<Profile>(`/citizens/${citizenId}/profile`)).data,
  });

  const { data: followInfo } = useQuery({
    queryKey: ["follow-info", citizenId],
    queryFn: async () => (await apiClient.get(`/citizens/${citizenId}/follow-info`)).data,
    enabled: !isOwnProfile,
  });

  const { data: posts } = useQuery({
    queryKey: ["feed-posts", { authorId: citizenId }],
    queryFn: async () => (await apiClient.get<{ items: ProfilePost[] }>("/posts", { params: { authorId: citizenId } })).data.items,
  });

  const { data: analytics } = useQuery({
    queryKey: ["feed-analytics"],
    queryFn: async () => (await apiClient.get<Analytics>("/citizens/me/analytics")).data,
    enabled: isOwnProfile && !!profile?.isVerified,
  });

  const followMutation = useMutation({
    mutationFn: async () => apiClient.post(`/citizens/${citizenId}/follow`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["follow-info", citizenId] }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      if (name) form.append("name", name);
      if (bio) form.append("bio", bio);
      if (city) form.append("city", city);
      if (photo) form.append("photo", photo as unknown as Blob);
      return apiClient.patch("/citizens/me/profile", form);
    },
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["user-profile", citizenId] });
    },
  });

  function startEdit() {
    setName(profile?.name ?? "");
    setBio(profile?.bio ?? "");
    setCity(profile?.city ?? "");
    setPhoto(null);
    setEditing(true);
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("अनुमति आवश्यक", "फोटो जोड़ने के लिए गैलरी एक्सेस की अनुमति दें।");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPhoto({ uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
    }
  }

  if (isLoading || !profile) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  const mediaPosts = (posts ?? []).filter((p) => p.mediaType === "IMAGE" && p.mediaUrl);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {photo || profile.profilePhotoUrl ? (
          <Image source={{ uri: photo?.uri ?? profile.profilePhotoUrl ?? undefined }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={32} color={colors.navy} />
          </View>
        )}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.info} />
              <Text style={styles.verifiedText}>{profile.verifiedLabel ?? "सत्यापित"}</Text>
            </View>
          )}
        </View>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        {profile.city && <Text style={styles.location}>📍 {profile.city}</Text>}

        {!!profile.badges?.length && (
          <View style={styles.badgeRow}>
            {profile.badges.map((b) => (
              <View key={b.key} style={styles.badgeChip}>
                <Text style={styles.badgeChipText}>
                  {b.emoji} {b.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.postsCount}</Text>
            <Text style={styles.statLabel}>पोस्ट</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.followersCount}</Text>
            <Text style={styles.statLabel}>फॉलोअर्स</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.followingCount}</Text>
            <Text style={styles.statLabel}>फॉलोइंग</Text>
          </View>
        </View>

        {isOwnProfile ? (
          <TouchableOpacity style={styles.editButton} onPress={startEdit}>
            <Text style={styles.editButtonText}>प्रोफाइल संपादित करें</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.followButton, followInfo?.followedByMe && styles.followButtonActive]}
            onPress={() => followMutation.mutate()}
          >
            <Text style={[styles.followButtonText, followInfo?.followedByMe && styles.followButtonTextActive]}>
              {followInfo?.followedByMe ? "फॉलो कर रहे हैं" : "फॉलो करें"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {analytics && (
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>📊 एनालिटिक्स</Text>
          <View style={styles.analyticsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{analytics.totalPosts}</Text>
              <Text style={styles.statLabel}>पोस्ट</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{analytics.totalReactions}</Text>
              <Text style={styles.statLabel}>रिएक्शन</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{analytics.totalComments}</Text>
              <Text style={styles.statLabel}>टिप्पणियां</Text>
            </View>
          </View>
          {analytics.topPost && (
            <Text style={styles.topPostText} numberOfLines={2}>
              🏆 सबसे लोकप्रिय: {analytics.topPost.content} ({analytics.topPost.likesCount} रिएक्शन)
            </Text>
          )}
        </View>
      )}

      {editing && (
        <View style={styles.editCard}>
          <TouchableOpacity onPress={handlePickPhoto} style={styles.photoPickButton}>
            <Text style={styles.photoPickText}>फोटो बदलें</Text>
          </TouchableOpacity>
          <TextInput style={styles.input} placeholder="नाम" value={name} onChangeText={setName} />
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="बायो"
            value={bio}
            onChangeText={setBio}
            multiline
          />
          <TextInput style={styles.input} placeholder="शहर" value={city} onChangeText={setCity} />
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Text style={styles.cancelText}>रद्द करें</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              disabled={saveMutation.isPending}
              onPress={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>सहेजें</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.tabRow}>
        {(["posts", "media", "about"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabButton, tab === t && styles.tabButtonActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === "posts" ? "पोस्ट" : t === "media" ? "मीडिया" : "जानकारी"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "posts" &&
        (posts?.length ? (
          posts.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.postCard}
              onPress={() => navigation.navigate("PostComments", { postId: p.id })}
            >
              <Text style={styles.postContent} numberOfLines={4}>
                {p.content}
              </Text>
              {p.mediaUrl && p.mediaType === "IMAGE" && <Image source={{ uri: p.mediaUrl }} style={styles.postImage} />}
              <Text style={styles.postMeta}>
                ❤️ {p.likesCount}  💬 {p.commentsCount}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>अभी तक कोई पोस्ट नहीं है।</Text>
        ))}

      {tab === "media" &&
        (mediaPosts.length ? (
          <View style={styles.mediaGrid}>
            {mediaPosts.map((p) => (
              <Image key={p.id} source={{ uri: p.mediaUrl! }} style={styles.mediaThumb} />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>अभी तक कोई मीडिया नहीं है।</Text>
        ))}

      {tab === "about" && (
        <View style={styles.aboutCard}>
          <Text style={styles.aboutLabel}>बायो</Text>
          <Text style={styles.aboutValue}>{profile.bio || "—"}</Text>
          <Text style={styles.aboutLabel}>शहर</Text>
          <Text style={styles.aboutValue}>{profile.city || "—"}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: `${colors.navy}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  verifiedText: { fontSize: 11, color: colors.info, fontWeight: "600" },
  bio: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },
  location: { fontSize: 12, color: colors.textFaint, marginTop: 4 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm, justifyContent: "center" },
  badgeChip: { backgroundColor: `${colors.navy}15`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeChipText: { fontSize: 11, fontWeight: "600", color: colors.navy },
  statsRow: { flexDirection: "row", gap: spacing.xxl, marginTop: spacing.lg },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  followButton: { borderWidth: 1, borderColor: colors.navy, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 8, marginTop: spacing.lg },
  followButtonActive: { backgroundColor: colors.navy },
  followButtonText: { fontSize: 13, fontWeight: "600", color: colors.navy },
  followButtonTextActive: { color: "#fff" },
  editButton: { borderWidth: 1, borderColor: colors.navy, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 8, marginTop: spacing.lg },
  editButtonText: { fontSize: 13, fontWeight: "600", color: colors.navy },
  analyticsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, ...shadow.card },
  analyticsTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  analyticsRow: { flexDirection: "row", justifyContent: "space-around", marginTop: spacing.md },
  topPostText: { fontSize: 12, color: colors.textMuted, marginTop: spacing.md },
  editCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, gap: spacing.sm, ...shadow.card },
  photoPickButton: { alignSelf: "flex-start" },
  photoPickText: { color: colors.navy, fontWeight: "600", fontSize: 13 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 14 },
  bioInput: { minHeight: 60, textAlignVertical: "top" },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg, marginTop: spacing.sm },
  cancelText: { color: colors.textMuted, fontWeight: "600" },
  saveButton: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  tabRow: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, marginTop: spacing.md, ...shadow.card },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center" },
  tabButtonActive: { backgroundColor: colors.navy },
  tabLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabLabelActive: { color: "#fff" },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  postCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadow.card },
  postContent: { fontSize: 14, color: colors.text },
  postImage: { width: "100%", height: 160, borderRadius: radius.md, marginTop: spacing.sm },
  postMeta: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  mediaThumb: { width: "32%", aspectRatio: 1, borderRadius: radius.sm },
  aboutCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, ...shadow.card },
  aboutLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  aboutValue: { fontSize: 14, color: colors.text, marginTop: 2 },
});
