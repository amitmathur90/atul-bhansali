import { StaffRole } from "@abc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useCategories, useWards } from "../../hooks/useAdminLookups";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई।";
}

interface StaffMember {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  phone: string | null;
  designation: string | null;
  isActive: boolean;
  wardAssignments: { ward: { id: string; name: string; wardNumber: number } }[];
  categoryAssignments: { category: { id: string; name: string } }[];
}

const ROLE_LABELS: Record<string, string> = { STAFF: "स्टाफ", MLA: "MLA", SUPER_ADMIN: "सुपर एडमिन" };

export function AdminStaffScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(StaffRole.STAFF);
  const [designation, setDesignation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-staff-all"],
    queryFn: async () => (await apiClient.get<{ items: StaffMember[] }>("/staff/all")).data.items,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post("/staff", {
        name,
        username,
        email: email || undefined,
        phone: phone || undefined,
        password,
        role,
        designation: designation || undefined,
      }),
    onSuccess: () => {
      setName("");
      setUsername("");
      setEmail("");
      setPhone("");
      setPassword("");
      setDesignation("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-staff-all"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/staff/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-staff-all"] }),
  });

  function confirmDeactivate(s: StaffMember) {
    Alert.alert(`${s.name} को निष्क्रिय करें?`, undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "निष्क्रिय करें", style: "destructive", onPress: () => deactivateMutation.mutate(s.id) },
    ]);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>नया स्टाफ जोड़ें</Text>
          <TextInput style={styles.input} placeholder="नाम" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="यूज़रनेम" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextInput
            style={styles.input}
            placeholder="ईमेल (वैकल्पिक)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="फोन (वैकल्पिक)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="number-pad"
            maxLength={10}
          />
          <TextInput
            style={styles.input}
            placeholder="पासवर्ड"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.chipRow}>
            {Object.values(StaffRole).map((r) => (
              <TouchableOpacity key={r} style={[styles.chip, role === r && styles.chipActive]} onPress={() => setRole(r)}>
                <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{ROLE_LABELS[r]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="पदनाम (वैकल्पिक)" value={designation} onChangeText={setDesignation} />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.addButton, (!name || !username || password.length < 6) && styles.addButtonDisabled]}
            disabled={!name || !username || password.length < 6 || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.addButtonText}>{createMutation.isPending ? "बनाया जा रहा है…" : "स्टाफ जोड़ें"}</Text>
          </TouchableOpacity>
          {isLoading && <Text style={styles.loadingText}>लोड हो रहा है…</Text>}
        </View>
      }
      renderItem={({ item: s }) => (
        <StaffRow
          staff={s}
          expanded={expandedId === s.id}
          onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
          onDeactivate={() => confirmDeactivate(s)}
        />
      )}
    />
  );
}

function StaffRow({
  staff,
  expanded,
  onToggle,
  onDeactivate,
}: {
  staff: StaffMember;
  expanded: boolean;
  onToggle: () => void;
  onDeactivate: () => void;
}) {
  const queryClient = useQueryClient();
  const wards = useWards();
  const categories = useCategories();
  const [wardIds, setWardIds] = useState<string[]>(staff.wardAssignments.map((a) => a.ward.id));
  const [categoryIds, setCategoryIds] = useState<string[]>(staff.categoryAssignments.map((a) => a.category.id));

  const assignMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/staff/${staff.id}/assignments`, { wardIds, categoryIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-staff-all"] }),
  });

  function toggleWard(id: string) {
    setWardIds((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
  }
  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  return (
    <View style={styles.staffCard}>
      <TouchableOpacity onPress={onToggle} style={styles.staffHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.staffName}>
            {staff.name} {!staff.isActive && <Text style={styles.inactiveTag}>निष्क्रिय</Text>}
          </Text>
          <Text style={styles.staffMeta}>
            {staff.username}
            {staff.email ? ` · ${staff.email}` : ""}
            {staff.phone ? ` · ${staff.phone}` : ""} · {ROLE_LABELS[staff.role]}
            {staff.designation ? ` · ${staff.designation}` : ""}
          </Text>
        </View>
        {staff.isActive && (
          <TouchableOpacity onPress={onDeactivate} hitSlop={8}>
            <Text style={styles.deactivateText}>निष्क्रिय करें</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {expanded && staff.role === StaffRole.STAFF && (
        <View style={styles.assignBox}>
          <Text style={styles.assignLabel}>वार्ड</Text>
          <View style={styles.chipRow}>
            {wards.data?.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.chip, wardIds.includes(w.id) && styles.chipActive]}
                onPress={() => toggleWard(w.id)}
              >
                <Text style={[styles.chipText, wardIds.includes(w.id) && styles.chipTextActive]}>
                  वार्ड {w.wardNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.assignLabel}>श्रेणियां</Text>
          <View style={styles.chipRow}>
            {categories.data?.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, categoryIds.includes(c.id) && styles.chipActive]}
                onPress={() => toggleCategory(c.id)}
              >
                <Text style={[styles.chipText, categoryIds.includes(c.id) && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.saveAssignBtn}
            disabled={assignMutation.isPending}
            onPress={() => assignMutation.mutate()}
          >
            <Text style={styles.saveAssignBtnText}>
              {assignMutation.isPending ? "सहेजा जा रहा है…" : "असाइनमेंट सहेजें"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm, ...shadow.card },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 12 },
  loadingText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  addButton: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 10, alignItems: "center" },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  staffCard: { backgroundColor: colors.surface, borderRadius: radius.md, ...shadow.card },
  staffHeader: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm },
  staffName: { fontSize: 14, fontWeight: "700", color: colors.text },
  inactiveTag: { fontSize: 10, color: colors.danger, fontWeight: "700" },
  staffMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deactivateText: { fontSize: 11, color: colors.danger, fontWeight: "700" },
  assignBox: { padding: spacing.md, paddingTop: 0, gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  assignLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, marginTop: spacing.sm },
  saveAssignBtn: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingVertical: 8, alignItems: "center", marginTop: spacing.sm },
  saveAssignBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
