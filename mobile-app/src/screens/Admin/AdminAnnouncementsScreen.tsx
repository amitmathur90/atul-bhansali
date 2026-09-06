import { AnnouncementType } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

const TYPE_LABELS: Record<string, string> = {
  DEVELOPMENT_PROJECT: "विकास कार्य",
  EMERGENCY_NOTICE: "आपातकालीन सूचना",
  GOVT_SCHEME: "सरकारी योजना",
  EVENT: "कार्यक्रम",
  BLOOD_DONATION: "रक्तदान",
  HEALTH_CAMP: "स्वास्थ्य शिविर",
  EMPLOYMENT_NEWS: "रोजगार समाचार",
};

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  isPublished: boolean;
  publishAt: string;
}

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई।";
}

export function AdminAnnouncementsScreen() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<string>(AnnouncementType.EVENT);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => (await apiClient.get<{ items: Announcement[] }>("/announcements")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("title", title);
      form.append("body", body);
      form.append("type", type);
      return apiClient.post("/announcements", form);
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });

  function confirmDelete(a: Announcement) {
    Alert.alert(`"${a.title}" हटाएं?`, undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "हटाएं", style: "destructive", onPress: () => deleteMutation.mutate(a.id) },
    ]);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>नई घोषणा जोड़ें</Text>
          <TextInput style={styles.input} placeholder="शीर्षक" value={title} onChangeText={setTitle} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="विवरण"
            value={body}
            onChangeText={setBody}
            multiline
          />
          <View style={styles.chipRow}>
            {Object.values(AnnouncementType).map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.addButton, (!title || !body) && styles.addButtonDisabled]}
            disabled={!title || !body || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.addButtonText}>{createMutation.isPending ? "पोस्ट हो रहा है…" : "घोषणा जोड़ें"}</Text>
          </TouchableOpacity>
          {isLoading && <Text style={styles.loadingText}>लोड हो रहा है…</Text>}
        </View>
      }
      renderItem={({ item: a }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {a.title} {!a.isPublished && <Text style={styles.draftTag}>ड्राफ्ट</Text>}
            </Text>
            <Text style={styles.rowMeta}>
              {TYPE_LABELS[a.type] ?? a.type} · {new Date(a.publishAt).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity onPress={() => confirmDelete(a)} hitSlop={8}>
            <Text style={styles.deleteText}>हटाएं</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm, ...shadow.card },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 13 },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  errorText: { color: colors.danger, fontSize: 12 },
  loadingText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
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
  draftTag: { fontSize: 10, color: colors.warning, fontWeight: "700" },
  rowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deleteText: { fontSize: 12, color: colors.danger, fontWeight: "700" },
});
