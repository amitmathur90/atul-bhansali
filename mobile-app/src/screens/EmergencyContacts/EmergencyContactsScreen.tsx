import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

interface Contact {
  id: string;
  name: string;
  category: string;
  phone: string;
}

const CATEGORY_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  POLICE: { label: "पुलिस", icon: "shield", color: "#2563eb" },
  FIRE: { label: "फायर ब्रिगेड", icon: "flame", color: "#dc2626" },
  AMBULANCE: { label: "एम्बुलेंस", icon: "medkit", color: "#16a34a" },
  WATER_DEPT: { label: "जल विभाग", icon: "water", color: "#0284c7" },
  ELECTRICITY_DEPT: { label: "विद्युत विभाग", icon: "flash", color: "#d97706" },
  MLA_OFFICE: { label: "एमएलए कार्यालय", icon: "business", color: colors.navy },
  OTHER: { label: "अन्य", icon: "call", color: "#64748b" },
};

export function EmergencyContactsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ["emergency-contacts"],
    queryFn: async () => (await apiClient.get<{ items: Contact[] }>("/emergency-contacts")).data.items,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  const firstContact = data?.[0];

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const meta = CATEGORY_META[item.category] ?? CATEGORY_META.OTHER;
          return (
            <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
              <View style={[styles.iconCircle, { backgroundColor: `${meta.color}20` }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.category}>{meta.label}</Text>
              </View>
              <View style={styles.phoneRow}>
                <Text style={styles.phone}>{item.phone}</Text>
                <Ionicons name="call" size={18} color={colors.navy} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
      {firstContact && (
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={() => Linking.openURL(`tel:${firstContact.phone}`)}
        >
          <Text style={styles.emergencyButtonText}>आपातकालीन कॉल करें</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  category: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  phoneRow: { alignItems: "center", gap: 4 },
  phone: { fontSize: 12, fontWeight: "700", color: colors.navy },
  emergencyButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    margin: spacing.lg,
  },
  emergencyButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
