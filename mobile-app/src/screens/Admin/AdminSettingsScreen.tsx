import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

const FIELDS: { key: string; label: string }[] = [
  { key: "contact.officeAddress", label: "कार्यालय पता" },
  { key: "contact.officeHours", label: "कार्यालय समय" },
  { key: "contact.phone", label: "फोन" },
  { key: "contact.email", label: "ईमेल" },
  { key: "contact.googleMapsUrl", label: "गूगल मैप्स URL" },
];

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई।";
}

export function AdminSettingsScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await apiClient.get<Record<string, string>>("/settings")).data,
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setValues(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => apiClient.patch("/settings", values),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>MLA संपर्क सेटिंग्स</Text>
      {isLoading && <Text style={styles.loadingText}>लोड हो रहा है…</Text>}
      <TouchableOpacity activeOpacity={1} style={styles.card}>
        {FIELDS.map((f) => (
          <TextInput
            key={f.key}
            style={styles.input}
            placeholder={f.label}
            value={values[f.key] ?? ""}
            onChangeText={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
          />
        ))}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {saved && <Text style={styles.savedText}>सहेजा गया</Text>}
        <TouchableOpacity
          style={styles.saveButton}
          disabled={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        >
          <Text style={styles.saveButtonText}>{saveMutation.isPending ? "सहेजा जा रहा है…" : "सहेजें"}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  loadingText: { color: colors.textMuted, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.card },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 12 },
  savedText: { color: colors.success, fontSize: 12 },
  saveButton: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 10, alignItems: "center", marginTop: spacing.xs },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
