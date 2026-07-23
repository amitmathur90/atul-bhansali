import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { apiClient } from "../../lib/api-client";
import type { HomeStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, spacing } from "../../theme";

type Props = NativeStackScreenProps<HomeStackParamList, "BookAppointment">;

export function BookAppointmentScreen({ navigation }: Props) {
  const citizen = useAuthStore((s) => s.citizen);
  const [purpose, setPurpose] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [contactNumber, setContactNumber] = useState(citizen?.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post("/appointments", {
          purpose,
          preferredDate,
          contactNumber,
        })
      ).data,
    onSuccess: () => {
      Alert.alert(
        "अनुरोध भेजा गया",
        "आपका मुलाकात अनुरोध कार्यालय को भेज दिया गया है। समय तय होने पर आपको सूचित किया जाएगा।",
        [{ text: "ठीक है", onPress: () => navigation.navigate("MyAppointments") }],
      );
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function handleSubmit() {
    if (purpose.trim().length < 5) return setError("कृपया मुलाकात का कारण थोड़ा विस्तार से लिखें");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) return setError("तारीख YYYY-MM-DD प्रारूप में दर्ज करें");
    if (!/^[6-9]\d{9}$/.test(contactNumber)) return setError("सही 10 अंकों का मोबाइल नंबर दर्ज करें");
    setError(null);
    submitMutation.mutate();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        माननीय विधायक से मुलाकात हेतु अनुरोध भेजें। कार्यालय आपके अनुरोध की समीक्षा कर तारीख व समय तय करेगा।
      </Text>

      <Text style={styles.label}>मुलाकात का कारण</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={purpose}
        onChangeText={setPurpose}
        placeholder="संक्षेप में बताएं कि आप क्यों मिलना चाहते हैं"
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>पसंदीदा तारीख</Text>
      <TextInput
        style={styles.input}
        value={preferredDate}
        onChangeText={setPreferredDate}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>संपर्क नंबर</Text>
      <TextInput
        style={styles.input}
        value={contactNumber}
        onChangeText={setContactNumber}
        keyboardType="number-pad"
        maxLength={10}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitMutation.isPending}>
        {submitMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>अनुरोध भेजें</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate("MyAppointments")}>
        <Text style={styles.linkButtonText}>मेरे मुलाकात अनुरोध देखें</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
    ?.error?.message;
  return message ?? "कुछ गड़बड़ हुई। कृपया पुनः प्रयास करें।";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 60 },
  intro: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  error: { color: colors.danger, marginTop: spacing.lg, fontSize: 13 },
  submitButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  linkButton: { alignItems: "center", marginTop: spacing.lg },
  linkButtonText: { color: colors.navy, fontWeight: "600", fontSize: 13 },
});
