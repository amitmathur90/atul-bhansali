import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useDepartments, type Department } from "../../hooks/useAdminLookups";
import { apiClient } from "../../lib/api-client";
import { colors, radius, shadow, spacing } from "../../theme";

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई।";
}

export function AdminDepartmentsScreen() {
  const queryClient = useQueryClient();
  const departments = useDepartments();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/departments", { name }),
    onSuccess: () => {
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.patch(`/departments/${id}`, data),
    onSuccess: () => {
      setEditingId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/departments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function confirmDelete(d: Department) {
    Alert.alert(`"${d.name}" विभाग हटाएं?`, undefined, [
      { text: "रद्द करें", style: "cancel" },
      { text: "हटाएं", style: "destructive", onPress: () => deleteMutation.mutate(d.id) },
    ]);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={departments.data ?? []}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>नया विभाग जोड़ें</Text>
          <TextInput style={styles.input} placeholder="विभाग का नाम" value={name} onChangeText={setName} />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.addButton, !name && styles.addButtonDisabled]}
            disabled={!name || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.addButtonText}>विभाग जोड़ें</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item: d }) =>
        editingId === d.id ? (
          <View style={styles.editRow}>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => updateMutation.mutate({ id: d.id, data: { name: editName } })}
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
            <Text style={styles.rowText}>{d.name}</Text>
            <View style={styles.rowActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditingId(d.id);
                  setEditName(d.name);
                }}
                hitSlop={8}
              >
                <Ionicons name="pencil" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(d)} hitSlop={8}>
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
  rowActions: { flexDirection: "row", gap: spacing.md },
  editActions: { flexDirection: "row", gap: spacing.sm },
  saveBtn: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  cancelBtnText: { color: colors.textMuted, fontWeight: "600", fontSize: 12 },
});
