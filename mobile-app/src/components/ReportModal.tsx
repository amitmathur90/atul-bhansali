import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors, radius, spacing } from "../theme";

const REASONS: { value: string; label: string }[] = [
  { value: "SPAM", label: "स्पैम" },
  { value: "FAKE_INFORMATION", label: "झूठी जानकारी" },
  { value: "ABUSE", label: "दुर्व्यवहार" },
  { value: "HATE_HARASSMENT", label: "नफरत / उत्पीड़न" },
  { value: "INAPPROPRIATE_CONTENT", label: "अनुचित सामग्री" },
  { value: "VIOLENCE", label: "हिंसा" },
  { value: "OTHER", label: "अन्य" },
];

export function ReportModal({
  title,
  onCancel,
  onSubmit,
  submitting,
}: {
  title: string;
  onCancel: () => void;
  onSubmit: (reasonType: string, details?: string) => void;
  submitting?: boolean;
}) {
  const [reasonType, setReasonType] = useState<string | null>(null);
  const [details, setDetails] = useState("");

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>{title}</Text>
        {REASONS.map((r) => (
          <TouchableOpacity key={r.value} style={styles.reasonRow} onPress={() => setReasonType(r.value)}>
            <View style={[styles.radio, reasonType === r.value && styles.radioActive]} />
            <Text style={styles.reasonLabel}>{r.label}</Text>
          </TouchableOpacity>
        ))}
        {reasonType === "OTHER" && (
          <TextInput
            style={styles.input}
            placeholder="विवरण लिखें…"
            value={details}
            onChangeText={setDetails}
            multiline
          />
        )}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancel}>रद्द करें</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!reasonType || submitting}
            style={[styles.submit, !reasonType && styles.submitDisabled]}
            onPress={() => reasonType && onSubmit(reasonType, details || undefined)}
          >
            <Text style={styles.submitText}>भेजें</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: "100%" },
  title: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border },
  radioActive: { borderColor: colors.navy, backgroundColor: colors.navy },
  reasonLabel: { fontSize: 13, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minHeight: 60,
    textAlignVertical: "top",
    fontSize: 13,
    marginTop: spacing.xs,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.lg, marginTop: spacing.md },
  cancel: { color: colors.textMuted, fontWeight: "600" },
  submit: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "700" },
});
