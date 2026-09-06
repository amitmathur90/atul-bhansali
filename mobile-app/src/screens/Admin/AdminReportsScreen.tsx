import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

const PERIODS = [
  { key: "daily", label: "दैनिक" },
  { key: "weekly", label: "साप्ताहिक" },
  { key: "monthly", label: "मासिक" },
  { key: "yearly", label: "वार्षिक" },
] as const;

interface PeriodSummary {
  total: number;
  received: number;
  assigned: number;
  inProgress: number;
  completed: number;
  rejected: number;
}

interface WardRow {
  ward: { name: string; wardNumber: number } | null;
  total: number;
  completed: number;
  pending: number;
}

interface CategoryRow {
  category: { name: string } | null;
  total: number;
  completed: number;
  pending: number;
}

interface OfficerRow {
  staff: { name: string } | null;
  assigned: number;
  completed: number;
  pending: number;
  avgResolutionHours: number | null;
}

export function AdminReportsScreen() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("monthly");

  const { data: summary } = useQuery({
    queryKey: ["admin-report-summary", period],
    queryFn: async () => (await apiClient.get<PeriodSummary>("/reports/complaints", { params: { period } })).data,
  });
  const { data: wardWise } = useQuery({
    queryKey: ["admin-report-ward"],
    queryFn: async () => (await apiClient.get<{ items: WardRow[] }>("/reports/ward-wise")).data.items,
  });
  const { data: categoryWise } = useQuery({
    queryKey: ["admin-report-category"],
    queryFn: async () => (await apiClient.get<{ items: CategoryRow[] }>("/reports/category-wise")).data.items,
  });
  const { data: officerWise } = useQuery({
    queryKey: ["admin-report-officer"],
    queryFn: async () => (await apiClient.get<{ items: OfficerRow[] }>("/reports/officer-wise")).data.items,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {summary && (
        <View style={styles.statGrid}>
          <Stat label="कुल" value={summary.total} />
          <Stat label="प्राप्त" value={summary.received} />
          <Stat label="सौंपा गया" value={summary.assigned} />
          <Stat label="प्रगति में" value={summary.inProgress} />
          <Stat label="पूर्ण" value={summary.completed} color={colors.success} />
          <Stat label="अस्वीकृत" value={summary.rejected} color={colors.danger} />
        </View>
      )}

      <Text style={styles.sectionTitle}>वार्ड-वार</Text>
      <View style={styles.card}>
        {wardWise?.map((w, i) => (
          <View key={i} style={styles.rowBetween}>
            <Text style={styles.rowLabel}>{w.ward ? `वार्ड ${w.ward.wardNumber} — ${w.ward.name}` : "—"}</Text>
            <Text style={styles.rowMeta}>
              कुल {w.total} · पूर्ण {w.completed} · लंबित {w.pending}
            </Text>
          </View>
        ))}
        {!wardWise?.length && <Text style={styles.emptyText}>कोई डेटा नहीं</Text>}
      </View>

      <Text style={styles.sectionTitle}>श्रेणी-वार</Text>
      <View style={styles.card}>
        {categoryWise?.map((c, i) => (
          <View key={i} style={styles.rowBetween}>
            <Text style={styles.rowLabel}>{c.category?.name ?? "—"}</Text>
            <Text style={styles.rowMeta}>
              कुल {c.total} · पूर्ण {c.completed} · लंबित {c.pending}
            </Text>
          </View>
        ))}
        {!categoryWise?.length && <Text style={styles.emptyText}>कोई डेटा नहीं</Text>}
      </View>

      <Text style={styles.sectionTitle}>अधिकारी-वार</Text>
      <View style={styles.card}>
        {officerWise?.map((o, i) => (
          <View key={i} style={styles.rowBetween}>
            <Text style={styles.rowLabel}>{o.staff?.name ?? "—"}</Text>
            <Text style={styles.rowMeta}>
              सौंपा {o.assigned} · पूर्ण {o.completed} · लंबित {o.pending}
            </Text>
          </View>
        ))}
        {!officerWise?.length && <Text style={styles.emptyText}>कोई डेटा नहीं</Text>}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  periodRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  periodChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface },
  periodChipActive: { backgroundColor: colors.navy },
  periodText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  periodTextActive: { color: "#fff" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  statCard: { width: "31%", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: "center", ...shadow.card },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  rowBetween: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  emptyText: { color: colors.textMuted, textAlign: "center", padding: spacing.md },
});
