import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { clearTokens } from "../../lib/secure-store";
import type { MainTabParamList, ProfileStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, "MoreMenu">,
  BottomTabScreenProps<MainTabParamList>
>;

export function MoreScreen({ navigation }: Props) {
  const citizen = useAuthStore((s) => s.citizen);
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await clearTokens();
    logout();
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={colors.navy} />
        </View>
        <Text style={styles.name}>{citizen?.name}</Text>
        {citizen?.address && <Text style={styles.address}>{citizen.address}</Text>}
        <Text style={styles.phone}>+91 {citizen?.phone}</Text>
      </View>

      <MenuRow
        label="मेरी शिकायतें"
        onPress={() => navigation.navigate("ComplaintTab", { screen: "MyComplaints" })}
      />
      <MenuRow
        label="सरकारी योजनाएं"
        onPress={() => navigation.navigate("HomeTab", { screen: "WelfareSchemesList" })}
      />
      <MenuRow
        label="मुलाकात हेतु अनुरोध"
        onPress={() => navigation.navigate("HomeTab", { screen: "BookAppointment" })}
      />
      <MenuRow label="मेरी जानकारी" onPress={() => Alert.alert("मेरी जानकारी", "जल्द उपलब्ध होगा।")} />
      <MenuRow label="नोटिफिकेशन सेटिंग" onPress={() => navigation.navigate("Notifications")} />
      <MenuRow
        label="भाषा बदलें"
        value="हिंदी"
        onPress={() => Alert.alert("भाषा बदलें", "यह सुविधा जल्द आ रही है।")}
      />
      <MenuRow label="सहायता और समर्थन" onPress={() => navigation.navigate("ContactMla")} />
      <MenuRow label="लॉगआउट" onPress={handleLogout} destructive />
    </View>
  );
}

function MenuRow({
  label,
  value,
  onPress,
  destructive,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.menuRow, styles.menuRowBetween]} onPress={onPress}>
      <Text style={[styles.menuLabel, destructive && styles.destructiveLabel]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: spacing.xl },
  profileCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: "center",
    ...shadow.card,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.navy}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  name: { fontSize: 17, fontWeight: "700", color: colors.text },
  address: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: "center" },
  phone: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  menuRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuRowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menuLabel: { fontSize: 15, color: colors.text },
  menuValue: { fontSize: 13, color: colors.textMuted },
  destructiveLabel: { color: colors.danger, fontWeight: "600" },
});
