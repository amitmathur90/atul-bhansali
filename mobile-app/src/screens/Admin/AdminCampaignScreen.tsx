import { CampaignPostType } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

const TYPE_LABELS: Record<string, string> = {
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

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई।";
}

export function AdminCampaignScreen() {
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
      style={styles.container}
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
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{TYPE_LABELS[t]}</Text>
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
              {TYPE_LABELS[p.type] ?? p.type} · ❤️ {p.likesCount} · {new Date(p.publishAt).toLocaleDateString()}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm, ...shadow.card },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  noteText: { fontSize: 11, color: colors.textFaint },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 13 },
  textArea: { minHeight: 60, textAlignVertical: "top" },
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
  rowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deleteText: { fontSize: 12, color: colors.danger, fontWeight: "700" },
});
