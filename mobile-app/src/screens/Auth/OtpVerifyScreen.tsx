import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Picker } from "@react-native-picker/picker";
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
import { useWards } from "../../lib/lookups";
import type { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

export function OtpVerifyScreen({ route }: Props) {
  const { phone, purpose, devOtp } = route.params;
  const setSession = useAuthStore((s) => s.setSession);
  const wards = useWards();

  const [otp, setOtp] = useState(devOtp ?? "");
  const [name, setName] = useState("");
  const [wardId, setWardId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNewRegistration = purpose === "REGISTRATION";

  async function handleVerify() {
    if (otp.length !== 6) {
      setError("6 अंकों का OTP दर्ज करें");
      return;
    }
    if (isNewRegistration && name.trim().length < 2) {
      setError("कृपया अपना नाम दर्ज करें");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/otp/verify", {
        phone,
        otp,
        ...(isNewRegistration
          ? {
              name,
              wardId: wardId || undefined,
              address: address || undefined,
              city: city || undefined,
              pincode: pincode || undefined,
            }
          : {}),
      });
      setSession(
        { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken },
        res.data.citizen,
      );
      // RootNavigator swaps to MainTabs automatically once accessToken is set.
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>OTP सत्यापित करें</Text>
        <Text style={styles.subtitle}>+91 {phone} पर भेजा गया 6 अंकों का कोड दर्ज करें</Text>

        {devOtp && (
          <View style={styles.devOtpBanner}>
            <Text style={styles.devOtpLabel}>DEV MODE — OTP:</Text>
            <Text style={styles.devOtpValue}>{devOtp}</Text>
          </View>
        )}

        <TextInput
          style={styles.otpInput}
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          placeholder="••••••"
          autoFocus
        />

        {isNewRegistration && (
          <View style={styles.profileFields}>
            <Text style={styles.sectionLabel}>अपना पंजीकरण पूर्ण करें</Text>
            <TextInput style={styles.input} placeholder="पूरा नाम" value={name} onChangeText={setName} />
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={wardId} onValueChange={setWardId}>
                <Picker.Item label="अपना वार्ड चुनें (वैकल्पिक)" value="" />
                {wards.data?.map((w) => (
                  <Picker.Item key={w.id} label={`वार्ड ${w.wardNumber} — ${w.name}`} value={w.id} />
                ))}
              </Picker>
            </View>
            <TextInput style={styles.input} placeholder="पता (वैकल्पिक)" value={address} onChangeText={setAddress} />
            <TextInput style={styles.input} placeholder="शहर (वैकल्पिक)" value={city} onChangeText={setCity} />
            <TextInput
              style={styles.input}
              placeholder="पिनकोड (वैकल्पिक)"
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={setPincode}
            />
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>सत्यापित करें और जारी रखें</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
    ?.error?.message;
  return message ?? "कुछ गड़बड़ हुई। कृपया पुनः प्रयास करें।";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 24, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24 },
  devOtpBanner: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 16,
  },
  devOtpLabel: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  devOtpValue: { fontSize: 18, fontWeight: "800", letterSpacing: 2, color: "#92400e" },
  otpInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    paddingVertical: 12,
  },
  profileFields: { marginTop: 24, gap: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  pickerWrapper: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8 },
  error: { color: "#dc2626", marginTop: 12, fontSize: 13, textAlign: "center" },
  button: { backgroundColor: "#F5821F", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
