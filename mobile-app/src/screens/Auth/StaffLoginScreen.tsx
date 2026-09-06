import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import type { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, spacing } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "StaffLogin">;

export function StaffLoginScreen({}: Props) {
  const setStaffSession = useAuthStore((s) => s.setStaffSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError("यूज़रनेम/ईमेल और पासवर्ड दर्ज करें");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/staff/login", { username: username.trim(), password });
      setStaffSession(
        { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken },
        res.data.staff,
      );
    } catch (err) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      setError(message ?? "लॉगिन विफल रहा। कृपया पुनः प्रयास करें।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Staff / Admin Login</Text>
        <Text style={styles.subtitle}>Username या Email और पासवर्ड दर्ज करें</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Username या Email</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl * 2 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xl },
  field: { marginBottom: spacing.md },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  error: { color: "#dc2626", fontSize: 13, marginBottom: spacing.md },
  button: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
