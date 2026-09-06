import { Ionicons } from "@expo/vector-icons";
import { StaffRole } from "@abc/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AdminMoreStackParamList } from "../../navigation/types";
import { clearTokens } from "../../lib/secure-store";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<AdminMoreStackParamList, "AdminMoreMenu">;

export function AdminMoreMenuScreen({ navigation }: Props) {
  const staff = useAuthStore((s) => s.staff);
  const logout = useAuthStore((s) => s.logout);
  const isSuperAdmin = staff?.role === StaffRole.SUPER_ADMIN;

  async function handleLogout() {
    await clearTokens();
    logout();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="shield-checkmark" size={30} color={colors.navy} />
        </View>
        <Text style={styles.name}>{staff?.name}</Text>
        <Text style={styles.role}>{staff?.role}</Text>
      </View>

      <MenuRow label="चुनाव अभियान" onPress={() => navigation.navigate("AdminCampaign")} />
      <MenuRow label="घोषणाएं / नोटिस" onPress={() => navigation.navigate("AdminAnnouncements")} />
      <MenuRow label="रिपोर्ट्स" onPress={() => navigation.navigate("AdminReports")} />

      {isSuperAdmin && (
        <>
          <Text style={styles.groupLabel}>सुपर एडमिन</Text>
          <MenuRow label="वार्ड" onPress={() => navigation.navigate("AdminWards")} />
          <MenuRow label="विभाग" onPress={() => navigation.navigate("AdminDepartments")} />
          <MenuRow label="श्रेणियां" onPress={() => navigation.navigate("AdminCategories")} />
          <MenuRow label="स्टाफ प्रबंधन" onPress={() => navigation.navigate("AdminStaff")} />
          <MenuRow label="सेटिंग्स" onPress={() => navigation.navigate("AdminSettings")} />
        </>
      )}

      <MenuRow label="लॉगआउट" onPress={handleLogout} destructive />
    </ScrollView>
  );
}

function MenuRow({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Text style={[styles.menuLabel, destructive && styles.destructiveLabel]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: spacing.xl * 3 },
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
  role: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  groupLabel: { fontSize: 11, fontWeight: "700", color: colors.textFaint, marginTop: spacing.lg, marginBottom: spacing.xs },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { fontSize: 15, color: colors.text },
  destructiveLabel: { color: colors.danger, fontWeight: "600" },
});
