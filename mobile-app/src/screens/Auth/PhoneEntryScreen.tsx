import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
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

// Replace these two files (same filenames) to update the photos — no code change
// needed, just overwrite the files and reload.
const mlaPhoto = require("../../../assets/mla-photo.png");
const heroBackground = require("../../../assets/home-hero-bg.png");

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneEntry">;

export function PhoneEntryScreen({ navigation }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("सही 10 अंकों का मोबाइल नंबर दर्ज करें");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/otp/request", { phone });
      navigation.navigate("OtpVerify", {
        phone,
        purpose: res.data.purpose,
        devOtp: res.data.devOtp,
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ImageBackground source={heroBackground} style={styles.heroBackground} resizeMode="cover">
          <View style={styles.heroOverlay} />
        </ImageBackground>
        <View style={styles.avatarRing}>
          <Image source={mlaPhoto} style={styles.avatar} resizeMode="cover" />
        </View>

        <View style={styles.formWrap}>
          <Text style={styles.title}>अतुल भंसाली सिटीज़न कनेक्ट</Text>
          <Text style={styles.subtitle}>जारी रखने के लिए अपना मोबाइल नंबर दर्ज करें</Text>

          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              placeholder="10 अंकों का मोबाइल नंबर"
              autoFocus
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>OTP भेजें</Text>}
          </TouchableOpacity>
        </View>
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
  screen: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  heroBackground: { height: 220, width: "100%" },
  heroOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#F5821F",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: -56,
    marginBottom: 12,
  },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  formWrap: { paddingHorizontal: 24 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24 },
  phoneRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12 },
  prefix: { fontSize: 16, color: "#333", marginRight: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  error: { color: "#dc2626", marginTop: 8, fontSize: 13 },
  button: { backgroundColor: "#F5821F", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
