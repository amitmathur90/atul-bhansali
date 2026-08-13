import NetInfo from "@react-native-community/netinfo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ComplaintPriority } from "@abc/shared";
import { apiClient } from "../../lib/api-client";
import { useCategories, useWards } from "../../lib/lookups";
import { enqueuePendingComplaint } from "../../lib/offline-queue";
import type { MyTicketsStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";

type Props = NativeStackScreenProps<MyTicketsStackParamList, "NewComplaint">;

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "कम",
  MEDIUM: "सामान्य",
  HIGH: "उच्च",
  EMERGENCY: "आपातकालीन",
};

export function NewComplaintScreen({ navigation }: Props) {
  const citizen = useAuthStore((s) => s.citizen);
  const categories = useCategories();
  const wards = useWards();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [wardId, setWardId] = useState(citizen?.wardId ?? "");
  const [address, setAddress] = useState(citizen?.address ?? "");
  const [priority, setPriority] = useState<string>(ComplaintPriority.MEDIUM);
  const [contactNumber, setContactNumber] = useState(citizen?.phone ?? "");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("अनुमति आवश्यक", "फोटो जोड़ने के लिए गैलरी एक्सेस की अनुमति दें।");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
    });
    if (!result.canceled) {
      const picked = result.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`,
        type: a.mimeType ?? "image/jpeg",
      }));
      setImages((prev) => [...prev, ...picked].slice(0, 5));
    }
  }

  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("अनुमति आवश्यक", "GPS स्थान जोड़ने के लिए लोकेशन एक्सेस की अनुमति दें।");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      Alert.alert("स्थान त्रुटि", "आपका वर्तमान स्थान प्राप्त नहीं हो सका।");
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit() {
    if (title.trim().length < 5) return setError("शीर्षक कम से कम 5 अक्षरों का होना चाहिए");
    if (description.trim().length < 10) return setError("कृपया समस्या का विस्तृत विवरण दें");
    if (!categoryId) return setError("कृपया श्रेणी चुनें");
    if (!wardId) return setError("कृपया वार्ड चुनें");
    if (address.trim().length < 3) return setError("कृपया पता दर्ज करें");
    if (!/^[6-9]\d{9}$/.test(contactNumber)) return setError("सही 10 अंकों का संपर्क नंबर दर्ज करें");

    setError(null);
    setSubmitting(true);

    const fields: Record<string, string> = {
      title,
      description,
      categoryId,
      wardId,
      address,
      priority,
      contactNumber,
    };
    if (coords) {
      fields.latitude = String(coords.latitude);
      fields.longitude = String(coords.longitude);
    }

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await enqueuePendingComplaint({ fields, images });
        Alert.alert(
          "सहेजा गया — आप ऑफ़लाइन हैं",
          "इंटरनेट वापस आने पर यह शिकायत स्वतः दर्ज हो जाएगी।",
          [{ text: "ठीक है", onPress: () => navigation.popToTop() }],
        );
        return;
      }

      const form = new FormData();
      Object.entries(fields).forEach(([key, value]) => form.append(key, value));
      images.forEach((img) => {
        // React Native's FormData accepts this {uri,name,type} shape directly.
        form.append("images", img as unknown as Blob);
      });

      // Don't set Content-Type manually — axios skips serializing FormData bodies and
      // lets React Native's XHR layer compute the multipart boundary itself. Setting it
      // explicitly here would omit the boundary param and break multer's parsing on the backend.
      const res = await apiClient.post("/complaints", form);

      Alert.alert("शिकायत दर्ज हो गई", `आपका शिकायत नंबर है ${res.data.complaintNumber}`, [
        { text: "ठीक है", onPress: () => navigation.replace("ComplaintDetail", { id: res.data.id }) },
      ]);
    } catch (err) {
      if (!(err as { response?: unknown }).response) {
        // No response at all usually means the request never reached the server (dropped
        // connectivity mid-request) — queue it rather than losing what the citizen typed.
        await enqueuePendingComplaint({ fields, images });
        Alert.alert(
          "सहेजा गया — कनेक्शन टूट गया",
          "इंटरनेट वापस आने पर यह शिकायत स्वतः दर्ज हो जाएगी।",
          [{ text: "ठीक है", onPress: () => navigation.popToTop() }],
        );
        return;
      }
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>शिकायत का शीर्षक</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="समस्या का संक्षिप्त विवरण" />

      <Text style={styles.label}>शिकायत का प्रकार *</Text>
      <View style={styles.pickerWrapper}>
        <Text style={styles.fieldIcon}>💧</Text>
        <Picker style={styles.pickerWithIcon} selectedValue={categoryId} onValueChange={setCategoryId}>
          <Picker.Item label="प्रकार चुनें…" value="" />
          {categories.data?.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={c.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>विस्तृत विवरण *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="समस्या का विस्तार से वर्णन करें"
        multiline
        numberOfLines={4}
        maxLength={500}
      />
      <Text style={styles.charCount}>{description.length}/500</Text>

      <Text style={styles.label}>स्थान (Address) *</Text>
      <View style={styles.addressRow}>
        <View style={styles.addressInputWrap}>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="सड़क / लैंडमार्क, जोधपुर"
          />
          <Text style={styles.pinIcon}>📍</Text>
        </View>
        <View style={styles.wardWrap}>
          <Picker selectedValue={wardId} onValueChange={setWardId}>
            <Picker.Item label="वार्ड" value="" />
            {wards.data?.map((w) => (
              <Picker.Item key={w.id} label={`वार्ड ${w.wardNumber}`} value={w.id} />
            ))}
          </Picker>
        </View>
      </View>

      <Text style={styles.label}>फोटो अपलोड करें</Text>
      <View style={styles.imagesRow}>
        {images.map((img, i) => (
          <Image key={i} source={{ uri: img.uri }} style={styles.thumbnail} />
        ))}
        {images.length < 5 && (
          <TouchableOpacity style={styles.addImageButton} onPress={handlePickImage}>
            <Text style={styles.addImageButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.checkboxRow} onPress={handleUseCurrentLocation} disabled={locating}>
        <View style={[styles.checkbox, coords && styles.checkboxChecked]}>
          {coords && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          {locating
            ? "स्थान प्राप्त हो रहा है…"
            : coords
              ? `मेरा स्थान भेजा गया (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)})`
              : "मेरा स्थान भेजें (GPS)"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>प्राथमिकता</Text>
      <View style={styles.pickerWrapper}>
        <Picker style={styles.pickerWithIcon} selectedValue={priority} onValueChange={setPriority}>
          {Object.values(ComplaintPriority).map((p) => (
            <Picker.Item key={p} label={PRIORITY_LABELS[p]} value={p} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>संपर्क नंबर</Text>
      <TextInput
        style={styles.input}
        value={contactNumber}
        onChangeText={setContactNumber}
        keyboardType="number-pad"
        maxLength={10}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>शिकायत दर्ज करें</Text>}
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
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
  },
  fieldIcon: { fontSize: 16, marginLeft: 8 },
  pickerWithIcon: { flex: 1 },
  charCount: { fontSize: 11, color: "#999", textAlign: "right", marginTop: 4 },
  addressRow: { flexDirection: "row", gap: 8 },
  addressInputWrap: { flex: 2, justifyContent: "center" },
  pinIcon: { position: "absolute", right: 12, fontSize: 16 },
  wardWrap: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, justifyContent: "center" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#F5821F",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#F5821F" },
  checkboxMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkboxLabel: { fontSize: 13, color: "#444", flexShrink: 1 },
  imagesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbnail: { width: 72, height: 72, borderRadius: 8 },
  addImageButton: { width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: "#ccc", borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  addImageButtonText: { fontSize: 28, color: "#999" },
  error: { color: "#dc2626", marginTop: 16, fontSize: 13 },
  submitButton: { backgroundColor: "#F5821F", borderRadius: 8, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
