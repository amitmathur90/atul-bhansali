import { Ionicons } from "@expo/vector-icons";
import { CampaignEventType, CampaignPostType, PartyStatus } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

async function pickImage(): Promise<{ uri: string; name: string; type: string } | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("अनुमति आवश्यक", "फोटो जोड़ने के लिए गैलरी एक्सेस की अनुमति दें।");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" };
}

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई।";
}

const TABS = [
  { key: "posts", label: "प्रचार सामग्री" },
  { key: "candidates", label: "उम्मीदवार घोषणा" },
  { key: "events", label: "अभियान कार्यक्रम" },
  { key: "feedback", label: "फीडबैक" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function AdminCampaignScreen() {
  const [tab, setTab] = useState<TabKey>("posts");

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TABS}
        keyExtractor={(t) => t.key}
        contentContainerStyle={styles.tabRow}
        renderItem={({ item: t }) => (
          <TouchableOpacity
            style={[styles.tabButton, tab === t.key && styles.tabButtonActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        )}
      />
      {tab === "posts" && <CampaignPostsTab />}
      {tab === "candidates" && <CandidateAnnouncementsTab />}
      {tab === "events" && <CampaignEventsTab />}
      {tab === "feedback" && <CampaignFeedbackTab />}
    </View>
  );
}

// --- Campaign Posts (प्रचार सामग्री) ---

const POST_TYPE_LABELS: Record<string, string> = {
  POSTER: "पोस्टर",
  VIDEO: "वीडियो",
  ANNOUNCEMENT: "घोषणा",
  WORK_UPDATE: "कार्य अपडेट",
  PUBLIC_MESSAGE: "सार्वजनिक संदेश",
};

interface CampaignPost {
  id: string;
  title: string;
  description: string | null;
  type: string;
  isPublished: boolean;
  publishAt: string;
  likesCount: number;
}

function CampaignPostsTab() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>(CampaignPostType.ANNOUNCEMENT);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-campaign-posts"],
    queryFn: async () => (await apiClient.get<{ items: CampaignPost[] }>("/campaign-posts")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("title", title);
      if (description) form.append("description", description);
      form.append("type", type);
      return apiClient.post("/campaign-posts", form);
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-posts"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/campaign-posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-campaign-posts"] }),
  });

  function confirmDelete(p: CampaignPost) {
    Alert.alert(`"${p.title}" हटाएं?`, undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "हटाएं", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  }

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>नई कैंपेन पोस्ट जोड़ें</Text>
          <Text style={styles.noteText}>
            (वीडियो पोस्ट के लिए सीधे यहां से अपलोड समर्थित नहीं है — पोस्टर/घोषणा/कार्य अपडेट/संदेश टाइप बनाएं)
          </Text>
          <TextInput style={styles.input} placeholder="शीर्षक" value={title} onChangeText={setTitle} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="विवरण (वैकल्पिक)"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.chipRow}>
            {Object.values(CampaignPostType)
              .filter((t) => t !== CampaignPostType.VIDEO)
              .map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{POST_TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.addButton, !title && styles.addButtonDisabled]}
            disabled={!title || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.addButtonText}>{createMutation.isPending ? "पोस्ट हो रहा है…" : "पोस्ट जोड़ें"}</Text>
          </TouchableOpacity>
          {isLoading && <Text style={styles.loadingText}>लोड हो रहा है…</Text>}
        </View>
      }
      renderItem={({ item: p }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{p.title}</Text>
            <Text style={styles.rowMeta}>
              {POST_TYPE_LABELS[p.type] ?? p.type} · ❤️ {p.likesCount} · {new Date(p.publishAt).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity onPress={() => confirmDelete(p)} hitSlop={8}>
            <Text style={styles.deleteText}>हटाएं</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

// --- Candidate Announcements (उम्मीदवार घोषणा) ---

interface CandidateAnnouncement {
  id: string;
  candidateName: string;
  profileImageUrl: string | null;
  position: string;
  constituency: string;
  partyStatus: string;
  partyName: string | null;
  message: string;
  isPublished: boolean;
  publishAt: string;
}

function CandidateAnnouncementsTab() {
  const queryClient = useQueryClient();
  const [candidateName, setCandidateName] = useState("");
  const [position, setPosition] = useState("");
  const [constituency, setConstituency] = useState("");
  const [partyStatus, setPartyStatus] = useState<string>(PartyStatus.PARTY);
  const [partyName, setPartyName] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-candidate-announcements"],
    queryFn: async () =>
      (await apiClient.get<{ items: CandidateAnnouncement[] }>("/candidate-announcements")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("candidateName", candidateName);
      form.append("position", position);
      form.append("constituency", constituency);
      form.append("partyStatus", partyStatus);
      if (partyStatus === PartyStatus.PARTY && partyName) form.append("partyName", partyName);
      form.append("message", message);
      if (image) form.append("image", image as unknown as Blob);
      return apiClient.post("/candidate-announcements", form);
    },
    onSuccess: () => {
      setCandidateName("");
      setPosition("");
      setConstituency("");
      setPartyName("");
      setMessage("");
      setImage(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-candidate-announcements"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/candidate-announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-candidate-announcements"] }),
  });

  function confirmDelete(c: CandidateAnnouncement) {
    Alert.alert(`"${c.candidateName}" की घोषणा हटाएं?`, undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "हटाएं", style: "destructive", onPress: () => deleteMutation.mutate(c.id) },
    ]);
  }

  const canSubmit = candidateName && position && constituency && message;

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>नई उम्मीदवार घोषणा जोड़ें</Text>
          <TextInput style={styles.input} placeholder="उम्मीदवार का नाम" value={candidateName} onChangeText={setCandidateName} />
          <TextInput style={styles.input} placeholder="पद (जैसे विधायक प्रत्याशी)" value={position} onChangeText={setPosition} />
          <TextInput style={styles.input} placeholder="निर्वाचन क्षेत्र" value={constituency} onChangeText={setConstituency} />
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, partyStatus === PartyStatus.PARTY && styles.chipActive]}
              onPress={() => setPartyStatus(PartyStatus.PARTY)}
            >
              <Text style={[styles.chipText, partyStatus === PartyStatus.PARTY && styles.chipTextActive]}>पार्टी</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, partyStatus === PartyStatus.INDEPENDENT && styles.chipActive]}
              onPress={() => setPartyStatus(PartyStatus.INDEPENDENT)}
            >
              <Text style={[styles.chipText, partyStatus === PartyStatus.INDEPENDENT && styles.chipTextActive]}>
                निर्दलीय
              </Text>
            </TouchableOpacity>
          </View>
          {partyStatus === PartyStatus.PARTY && (
            <TextInput style={styles.input} placeholder="पार्टी का नाम" value={partyName} onChangeText={setPartyName} />
          )}
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="संदेश"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          {image ? (
            <View style={styles.imagePreviewRow}>
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoPickBtn} onPress={async () => setImage(await pickImage())}>
              <Ionicons name="image-outline" size={18} color={colors.navy} />
              <Text style={styles.photoPickText}>उम्मीदवार की फोटो जोड़ें (वैकल्पिक)</Text>
            </TouchableOpacity>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.addButton, !canSubmit && styles.addButtonDisabled]}
            disabled={!canSubmit || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.addButtonText}>{createMutation.isPending ? "पोस्ट हो रहा है…" : "घोषणा जोड़ें"}</Text>
          </TouchableOpacity>
          {isLoading && <Text style={styles.loadingText}>लोड हो रहा है…</Text>}
        </View>
      }
      renderItem={({ item: c }) => (
        <View style={styles.row}>
          {c.profileImageUrl ? (
            <Image source={{ uri: c.profileImageUrl }} style={styles.candidateThumb} />
          ) : (
            <View style={styles.candidateThumbPlaceholder}>
              <Ionicons name="person" size={18} color={colors.textFaint} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{c.candidateName}</Text>
            <Text style={styles.rowMeta}>
              {c.position} · {c.constituency} · {c.partyStatus === PartyStatus.PARTY ? c.partyName ?? "पार्टी" : "निर्दलीय"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => confirmDelete(c)} hitSlop={8}>
            <Text style={styles.deleteText}>हटाएं</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

// --- Campaign Events (अभियान कार्यक्रम) ---

const EVENT_TYPE_LABELS: Record<string, string> = {
  PUBLIC_MEETING: "जनसभा",
  RALLY: "रैली",
  PROGRAM: "कार्यक्रम",
};

interface CampaignEvent {
  id: string;
  title: string;
  type: string;
  eventDate: string;
  location: string;
  details: string | null;
  isActive: boolean;
  interestedCount: number;
}

function CampaignEventsTab() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>(CampaignEventType.PUBLIC_MEETING);
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-campaign-events"],
    queryFn: async () => (await apiClient.get<{ items: CampaignEvent[] }>("/campaign-events")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/campaign-events", {
        title,
        type,
        eventDate: new Date(eventDate).toISOString(),
        location,
        details: details || undefined,
      }),
    onSuccess: () => {
      setTitle("");
      setEventDate("");
      setLocation("");
      setDetails("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-events"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/campaign-events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-campaign-events"] }),
  });

  function confirmDelete(e: CampaignEvent) {
    Alert.alert(`"${e.title}" हटाएं?`, undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "हटाएं", style: "destructive", onPress: () => deleteMutation.mutate(e.id) },
    ]);
  }

  const validDate = !isNaN(new Date(eventDate).getTime());
  const canSubmit = title && location && eventDate && validDate;

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>नया अभियान कार्यक्रम जोड़ें</Text>
          <TextInput style={styles.input} placeholder="शीर्षक" value={title} onChangeText={setTitle} />
          <View style={styles.chipRow}>
            {Object.values(CampaignEventType).map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{EVENT_TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="तारीख व समय (YYYY-MM-DD HH:MM)"
            value={eventDate}
            onChangeText={setEventDate}
          />
          <TextInput style={styles.input} placeholder="स्थान" value={location} onChangeText={setLocation} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="विवरण (वैकल्पिक)"
            value={details}
            onChangeText={setDetails}
            multiline
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.addButton, !canSubmit && styles.addButtonDisabled]}
            disabled={!canSubmit || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.addButtonText}>{createMutation.isPending ? "जोड़ा जा रहा है…" : "कार्यक्रम जोड़ें"}</Text>
          </TouchableOpacity>
          {isLoading && <Text style={styles.loadingText}>लोड हो रहा है…</Text>}
        </View>
      }
      renderItem={({ item: e }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{e.title}</Text>
            <Text style={styles.rowMeta}>
              {EVENT_TYPE_LABELS[e.type] ?? e.type} · {e.location} · {new Date(e.eventDate).toLocaleString()}
            </Text>
            <Text style={styles.rowMeta}>रुचि दिखाई: {e.interestedCount}</Text>
          </View>
          <TouchableOpacity onPress={() => confirmDelete(e)} hitSlop={8}>
            <Text style={styles.deleteText}>हटाएं</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

// --- Campaign Feedback (फीडबैक) ---

interface CampaignFeedbackItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  citizen: { name: string; phone: string };
}

function CampaignFeedbackTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-campaign-feedback"],
    queryFn: async () => (await apiClient.get<{ items: CampaignFeedbackItem[] }>("/campaign-feedback")).data.items,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/campaign-feedback/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-campaign-feedback"] }),
  });

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(f) => f.id}
      ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>अभी तक कोई फीडबैक नहीं है।</Text> : null}
      renderItem={({ item: f }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {f.citizen.name} {!f.isRead && <Text style={styles.unreadTag}>नया</Text>}
            </Text>
            <Text style={styles.feedbackMessage}>{f.message}</Text>
            <Text style={styles.rowMeta}>
              {f.citizen.phone} · {new Date(f.createdAt).toLocaleString()}
            </Text>
          </View>
          {!f.isRead && (
            <TouchableOpacity onPress={() => markReadMutation.mutate(f.id)} hitSlop={8}>
              <Text style={styles.markReadText}>पढ़ा गया</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  tabButton: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface },
  tabButtonActive: { backgroundColor: colors.navy },
  tabLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  tabLabelActive: { color: "#fff" },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm, ...shadow.card },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  noteText: { fontSize: 11, color: colors.textFaint },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 13 },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  errorText: { color: colors.danger, fontSize: 12 },
  loadingText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
  addButton: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 10, alignItems: "center" },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    ...shadow.card,
  },
  rowTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  unreadTag: { fontSize: 10, color: colors.danger, fontWeight: "700" },
  rowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  feedbackMessage: { fontSize: 13, color: colors.text, marginTop: 4 },
  deleteText: { fontSize: 12, color: colors.danger, fontWeight: "700" },
  photoPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  photoPickText: { fontSize: 12, color: colors.navy, fontWeight: "600" },
  imagePreviewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  imagePreview: { width: 64, height: 64, borderRadius: radius.sm },
  removeImageBtn: { padding: 4 },
  candidateThumb: { width: 40, height: 40, borderRadius: 20 },
  candidateThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  markReadText: { fontSize: 12, color: colors.navy, fontWeight: "700" },
});
