import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiClient } from "../../lib/api-client";
import type { FeedStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<FeedStackParamList, "CreatePoster">;

interface PosterTemplate {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string;
}

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई। कृपया पुनः प्रयास करें।";
}

async function pickSelfie(): Promise<{ uri: string; name: string; type: string } | null> {
  return new Promise((resolve) => {
    Alert.alert("सेल्फी चुनें", undefined, [
      { text: "रद्द करें", style: "cancel", onPress: () => resolve(null) },
      {
        text: "कैमरा",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("अनुमति आवश्यक", "सेल्फी लेने के लिए कैमरा एक्सेस की अनुमति दें।");
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
          if (result.canceled || !result.assets[0]) {
            resolve(null);
            return;
          }
          const a = result.assets[0];
          resolve({ uri: a.uri, name: a.fileName ?? `selfie-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
        },
      },
      {
        text: "गैलरी",
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("अनुमति आवश्यक", "फोटो चुनने के लिए गैलरी एक्सेस की अनुमति दें।");
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
          if (result.canceled || !result.assets[0]) {
            resolve(null);
            return;
          }
          const a = result.assets[0];
          resolve({ uri: a.uri, name: a.fileName ?? `selfie-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
        },
      },
    ]);
  });
}

export function CreatePosterScreen({ navigation }: Props) {
  const citizen = useAuthStore((s) => s.citizen);
  const staff = useAuthStore((s) => s.staff);
  const queryClient = useQueryClient();

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [name, setName] = useState(citizen?.name ?? staff?.name ?? "");
  const [city, setCity] = useState(citizen?.city ?? "");
  const [ward, setWard] = useState("");
  const [designation, setDesignation] = useState("");
  const [message, setMessage] = useState("");
  const [generated, setGenerated] = useState<{ id: string; resultUrl: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["poster-templates"],
    queryFn: async () => (await apiClient.get<{ items: PosterTemplate[] }>("/poster-templates")).data.items,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("templateId", templateId!);
      form.append("name", name.trim());
      if (city.trim()) form.append("city", city.trim());
      if (ward.trim()) form.append("ward", ward.trim());
      if (designation.trim()) form.append("designation", designation.trim());
      if (message.trim()) form.append("message", message.trim());
      form.append("selfie", selfie as unknown as Blob);
      return (await apiClient.post<{ id: string; resultUrl: string }>("/poster-generations", form)).data;
    },
    onSuccess: (data) => {
      setGenerated(data);
      setError(null);
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const publishMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/poster-generations/${generated!.id}/publish`, { content: caption.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      Alert.alert("पब्लिश हो गया", "आपका पोस्टर फीड पर पोस्ट कर दिया गया है।", [
        { text: "ठीक है", onPress: () => navigation.navigate("FeedList") },
      ]);
    },
    onError: (err) => Alert.alert("असफल", extractErrorMessage(err)),
  });

  async function handleShare() {
    if (!generated) return;
    await Share.share(Platform.OS === "ios" ? { url: generated.resultUrl } : { message: generated.resultUrl });
  }

  function startOver() {
    setGenerated(null);
    setSelfie(null);
    setTemplateId(null);
    setCaption("");
    setWard("");
    setDesignation("");
    setMessage("");
  }

  if (generated) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>आपका पोस्टर तैयार है</Text>
        <Image source={{ uri: generated.resultUrl }} style={styles.previewImage} resizeMode="contain" />

        <TextInput
          style={styles.input}
          placeholder="कैप्शन लिखें (वैकल्पिक)"
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        <TouchableOpacity
          style={styles.primaryButton}
          disabled={publishMutation.isPending}
          onPress={() => publishMutation.mutate()}
        >
          {publishMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>फीड पर पब्लिश करें</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={16} color={colors.navy} />
          <Text style={styles.secondaryButtonText}>बाहर शेयर करें</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={startOver}>
          <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>दोबारा बनाएं</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const canGenerate = !!templateId && !!selfie && !!name.trim();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>1. टेम्पलेट चुनें</Text>
      {isLoading && <Text style={styles.loadingText}>लोड हो रहा है…</Text>}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={templates ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ gap: spacing.sm }}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>अभी कोई टेम्पलेट उपलब्ध नहीं है।</Text> : null
        }
        renderItem={({ item: t }) => (
          <TouchableOpacity
            style={[styles.templateCard, templateId === t.id && styles.templateCardActive]}
            onPress={() => setTemplateId(t.id)}
          >
            <Image source={{ uri: t.imageUrl }} style={styles.templateThumb} />
            <Text style={styles.templateName} numberOfLines={1}>
              {t.name}
            </Text>
            {t.category && (
              <Text style={styles.templateCategory} numberOfLines={1}>
                {t.category}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      <Text style={styles.sectionTitle}>2. अपनी सेल्फी चुनें</Text>
      {selfie ? (
        <View style={styles.selfieRow}>
          <Image source={{ uri: selfie.uri }} style={styles.selfiePreview} />
          <TouchableOpacity style={styles.secondaryButton} onPress={async () => setSelfie(await pickSelfie())}>
            <Text style={styles.secondaryButtonText}>बदलें</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.selfiePickBtn} onPress={async () => setSelfie(await pickSelfie())}>
          <Ionicons name="camera-outline" size={20} color={colors.navy} />
          <Text style={styles.secondaryButtonText}>सेल्फी लें / चुनें</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>3. अपना नाम दर्ज करें</Text>
      <TextInput style={styles.input} placeholder="आपका नाम" value={name} onChangeText={setName} />

      <Text style={styles.optionalLabel}>अतिरिक्त विवरण (वैकल्पिक)</Text>
      <TextInput style={styles.input} placeholder="शहर" value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="वार्ड" value={ward} onChangeText={setWard} />
      <TextInput style={styles.input} placeholder="पदनाम" value={designation} onChangeText={setDesignation} />
      <TextInput style={styles.input} placeholder="समर्थक संदेश" value={message} onChangeText={setMessage} />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.primaryButton, !canGenerate && styles.primaryButtonDisabled]}
        disabled={!canGenerate || generateMutation.isPending}
        onPress={() => generateMutation.mutate()}
      >
        {generateMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>पोस्टर बनाएं</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  loadingText: { color: colors.textMuted, fontSize: 12 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  templateCard: {
    width: 110,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
    borderWidth: 2,
    borderColor: "transparent",
    ...shadow.card,
  },
  templateCardActive: { borderColor: colors.navy },
  templateThumb: { width: "100%", height: 130, borderRadius: radius.sm, backgroundColor: colors.background },
  templateName: { fontSize: 11, color: colors.text, marginTop: 4, textAlign: "center" },
  templateCategory: { fontSize: 9, color: colors.textFaint, textAlign: "center" },
  optionalLabel: { fontSize: 11, color: colors.textFaint, fontWeight: "600", marginTop: spacing.xs },
  selfieRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  selfiePreview: { width: 72, height: 72, borderRadius: 36 },
  selfiePickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  errorText: { color: colors.danger, fontSize: 12 },
  primaryButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: colors.navy, fontWeight: "600", fontSize: 13 },
  previewImage: { width: "100%", height: 420, borderRadius: radius.md, backgroundColor: colors.surface },
});
