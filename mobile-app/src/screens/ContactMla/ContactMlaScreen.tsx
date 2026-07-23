import { useQuery } from "@tanstack/react-query";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, spacing } from "../../theme";

export function ContactMlaScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await apiClient.get<Record<string, string>>("/settings")).data,
  });

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>एमएलए कार्यालय</Text>

      <InfoRow label="पता" value={data["contact.officeAddress"]} />
      <InfoRow label="कार्यालय समय" value={data["contact.officeHours"]} />

      {data["contact.phone"] && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${data["contact.phone"]}`)}>
          <InfoRow label="फोन" value={data["contact.phone"]} linkColor />
        </TouchableOpacity>
      )}
      {data["contact.email"] && (
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${data["contact.email"]}`)}>
          <InfoRow label="ईमेल" value={data["contact.email"]} linkColor />
        </TouchableOpacity>
      )}
      {data["contact.googleMapsUrl"] && (
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => Linking.openURL(data["contact.googleMapsUrl"])}
        >
          <Text style={styles.mapButtonText}>गूगल मैप्स में खोलें</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value, linkColor }: { label: string; value?: string; linkColor?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, linkColor && styles.link]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.xl },
  title: { fontSize: 19, fontWeight: "700", color: colors.text, marginBottom: spacing.xl },
  row: { marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 15, color: colors.text, marginTop: 2 },
  link: { color: colors.navy, fontWeight: "600" },
  mapButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
  },
  mapButtonText: { color: "#fff", fontWeight: "600" },
});
