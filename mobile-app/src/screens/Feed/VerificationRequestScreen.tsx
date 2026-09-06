import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, spacing } from "../../theme";

interface VerificationRequestItem {
  id: string;
  requestedLabel: string;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "समीक्षा में",
  APPROVED: "स्वीकृत",
  REJECTED: "अस्वीकृत",
};

export function VerificationRequestScreen() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["verification-requests-mine"],
    queryFn: async () =>
      (await apiClient.get<{ items: VerificationRequestItem[] }>("/verification-requests/mine")).data.items,
  });

  const submitMutation = useMutation({
    mutationFn: async () => apiClient.post("/verification-requests", { requestedLabel: label }),
    onSuccess: () => {
      setLabel("");
      queryClient.invalidateQueries({ queryKey: ["verification-requests-mine"] });
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          यदि आप उम्मीदवार, जनप्रतिनिधि, सामुदायिक नेता या संगठन हैं, तो सत्यापित बैज के लिए अनुरोध भेजें।
        </Text>
        <Text style={styles.label}>अपनी भूमिका बताएं (जैसे: MLA, उम्मीदवार, सामाजिक कार्यकर्ता)</Text>
        <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="भूमिका लिखें…" />
        <TouchableOpacity
          style={[styles.submitButton, !label.trim() && styles.submitButtonDisabled]}
          disabled={!label.trim() || submitMutation.isPending}
          onPress={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>अनुरोध भेजें</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.historyTitle}>मेरे अनुरोध</Text>
        {isLoading && <Text style={styles.emptyText}>लोड हो रहा है…</Text>}
        {data?.length === 0 && <Text style={styles.emptyText}>अभी तक कोई अनुरोध नहीं है।</Text>}
        {data?.map((r) => (
          <View key={r.id} style={styles.historyRow}>
            <Text style={styles.historyLabel}>{r.requestedLabel}</Text>
            <Text style={styles.historyStatus}>{STATUS_LABELS[r.status] ?? r.status}</Text>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl },
  intro: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 19 },
  label: { fontSize: 13, color: colors.text, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  historyTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.xxl, marginBottom: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textMuted },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyLabel: { fontSize: 14, color: colors.text },
  historyStatus: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
});
