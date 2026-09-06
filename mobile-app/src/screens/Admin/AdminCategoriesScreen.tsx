import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useCategories, useDepartments, type Category } from "../../hooks/useAdminLookups";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई।";
}

export function AdminCategoriesScreen() {
  const queryClient = useQueryClient();
  const categories = useCategories();
  const departments = useDepartments();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", departmentId: "" });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/categories", { name, departmentId }),
    onSuccess: () => {
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.patch(`/categories/${id}`, data),
    onSuccess: () => {
      setEditingId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditDraft({ name: c.name, departmentId: c.departmentId ?? c.department?.id ?? "" });
  }

  function confirmDeactivate(c: Category) {
    Alert.alert(`"${c.name}" श्रेणी निष्क्रिय करें?`, "यह नई शिकायतों की सूची से हट जाएगी।", [
      { text: "रद्द करें", style: "cancel" },
      { text: "निष्क्रिय करें", style: "destructive", onPress: () => deactivateMutation.mutate(c.id) },
    ]);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={categories.data ?? []}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>नई श्रेणी जोड़ें</Text>
          <TextInput style={styles.input} placeholder="श्रेणी का नाम" value={name} onChangeText={setName} />
          <View style={styles.chipRow}>
            {departments.data?.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.chip, departmentId === d.id && styles.chipActive]}
                onPress={() => setDepartmentId(d.id)}
              >
                <Text style={[styles.chipText, departmentId === d.id && styles.chipTextActive]}>{d.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.addButton, (!name || !departmentId) && styles.addButtonDisabled]}
            disabled={!name || !departmentId || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.addButtonText}>श्रेणी जोड़ें</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item: c }) =>
        editingId === c.id ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={editDraft.name}
              onChangeText={(v) => setEditDraft((d) => ({ ...d, name: v }))}
            />
            <View style={styles.chipRow}>
              {departments.data?.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.chip, editDraft.departmentId === d.id && styles.chipActive]}
                  onPress={() => setEditDraft((draft) => ({ ...draft, departmentId: d.id }))}
                >
                  <Text style={[styles.chipText, editDraft.departmentId === d.id && styles.chipTextActive]}>
                    {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => updateMutation.mutate({ id: c.id, data: editDraft })}
              >
                <Text style={styles.saveBtnText}>सहेजें</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                <Text style={styles.cancelBtnText}>रद्द करें</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.rowText}>
              {c.name}
              {c.department && <Text style={styles.rowSubText}> — {c.department.name}</Text>}
            </Text>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => startEdit(c)} hitSlop={8}>
                <Ionicons name="pencil" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDeactivate(c)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm, ...shadow.card },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 12 },
  addButton: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 10, alignItems: "center" },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    ...shadow.card,
  },
  editRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, ...shadow.card },
  rowText: { fontSize: 13, color: colors.text, flex: 1 },
  rowSubText: { fontSize: 11, color: colors.textFaint },
  rowActions: { flexDirection: "row", gap: spacing.md },
  editActions: { flexDirection: "row", gap: spacing.sm },
  saveBtn: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  cancelBtnText: { color: colors.textMuted, fontWeight: "600", fontSize: 12 },
});
