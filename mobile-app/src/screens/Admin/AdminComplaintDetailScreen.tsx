import { COMPLAINT_STATUS_TRANSITIONS, StaffRole } from "@abc/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useStaffOptions } from "../../hooks/useAdminLookups";
import { apiClient } from "../../lib/api-client";
import type { AdminComplaintsStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { colors, radius, shadow, spacing } from "../../theme";

type Props = NativeStackScreenProps<AdminComplaintsStackParamList, "AdminComplaintDetail">;

interface ComplaintDetail {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contactNumber: string;
  createdAt: string;
  citizen: { name: string; phone: string };
  category: { name: string };
  ward: { name: string; wardNumber: number };
  assignedStaff: { id: string; name: string } | null;
  images: { id: string; url: string }[];
  statusHistory?: { id: string; toStatus: string; remarks: string | null; createdAt: string }[];
}

export function AdminComplaintDetailScreen({ route }: Props) {
  const { id } = route.params;
  const staff = useAuthStore((s) => s.staff);
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: complaint, isLoading } = useQuery({
    queryKey: ["admin-complaint", id],
    queryFn: async () => (await apiClient.get<ComplaintDetail>(`/complaints/${id}`)).data,
  });

  const staffOptions = useStaffOptions();

  const assignMutation = useMutation({
    mutationFn: async (staffId: string) => (await apiClient.patch(`/complaints/${id}/assign`, { staffId })).data,
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-complaint", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.patch(`/complaints/${id}/status`, { status: nextStatus, remarks })).data,
    onSuccess: () => {
      setActionError(null);
      setRemarks("");
      setNextStatus("");
      queryClient.invalidateQueries({ queryKey: ["admin-complaint", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
    onError: (err) => setActionError(extractErrorMessage(err)),
  });

  if (isLoading || !complaint) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  const canAssign = staff?.role === StaffRole.MLA || staff?.role === StaffRole.SUPER_ADMIN;
  const canUpdateStatus =
    staff?.role === StaffRole.MLA ||
    staff?.role === StaffRole.SUPER_ADMIN ||
    complaint.assignedStaff?.id === staff?.id;
  const allowedNextStatuses = COMPLAINT_STATUS_TRANSITIONS[complaint.status as keyof typeof COMPLAINT_STATUS_TRANSITIONS] ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {complaint.complaintNumber} — {complaint.title}
      </Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{complaint.status.replace("_", " ")}</Text>
        </View>
        <View style={[styles.badge, styles.badgeAlt]}>
          <Text style={styles.badgeText}>{complaint.priority}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>विवरण</Text>
        <Row label="श्रेणी" value={complaint.category.name} />
        <Row label="वार्ड" value={`वार्ड ${complaint.ward.wardNumber} — ${complaint.ward.name}`} />
        <Row label="पता" value={complaint.address} />
        <Row label="संपर्क" value={complaint.contactNumber} />
        <Row label="नागरिक" value={`${complaint.citizen.name} (${complaint.citizen.phone})`} />
        <Row label="सौंपा गया" value={complaint.assignedStaff?.name ?? "अभी नहीं"} />
        <Row label="दर्ज तिथि" value={new Date(complaint.createdAt).toLocaleString()} />
        <Text style={styles.description}>{complaint.description}</Text>

        {complaint.images.length > 0 && (
          <View style={styles.imagesRow}>
            {complaint.images.map((img) => (
              <Image key={img.id} source={{ uri: img.url }} style={styles.image} />
            ))}
          </View>
        )}
      </View>

      {canAssign && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>स्टाफ सौंपें</Text>
          <View style={styles.chipRow}>
            {staffOptions.data?.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, selectedStaffId === s.id && styles.chipActive]}
                onPress={() => setSelectedStaffId(s.id)}
              >
                <Text style={[styles.chipText, selectedStaffId === s.id && styles.chipTextActive]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.actionButton, !selectedStaffId && styles.actionButtonDisabled]}
            disabled={!selectedStaffId || assignMutation.isPending}
            onPress={() => assignMutation.mutate(selectedStaffId)}
          >
            <Text style={styles.actionButtonText}>
              {assignMutation.isPending ? "सौंपा जा रहा है…" : "सौंपें"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {canUpdateStatus && allowedNextStatuses.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>स्थिति अपडेट करें</Text>
          <View style={styles.chipRow}>
            {allowedNextStatuses.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, nextStatus === s && styles.chipActive]}
                onPress={() => setNextStatus(s)}
              >
                <Text style={[styles.chipText, nextStatus === s && styles.chipTextActive]}>
                  {s.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="टिप्पणी (वैकल्पिक)"
            value={remarks}
            onChangeText={setRemarks}
            multiline
          />
          <TouchableOpacity
            style={[styles.actionButton, !nextStatus && styles.actionButtonDisabled]}
            disabled={!nextStatus || statusMutation.isPending}
            onPress={() => statusMutation.mutate()}
          >
            <Text style={styles.actionButtonText}>
              {statusMutation.isPending ? "अपडेट हो रहा है…" : "अपडेट करें"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {actionError && <Text style={styles.errorText}>{actionError}</Text>}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>समयरेखा</Text>
        {complaint.statusHistory?.map((h) => (
          <View key={h.id} style={styles.timelineRow}>
            <Text style={styles.timelineStatus}>{h.toStatus.replace("_", " ")}</Text>
            <Text style={styles.timelineDate}>{new Date(h.createdAt).toLocaleString()}</Text>
            {h.remarks && <Text style={styles.timelineRemarks}>{h.remarks}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message;
  return message ?? "कुछ गड़बड़ हुई।";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  badgeRow: { flexDirection: "row", gap: spacing.sm },
  badge: { backgroundColor: `${colors.navy}15`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeAlt: { backgroundColor: `${colors.danger}15` },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.card },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { fontSize: 12, color: colors.textMuted },
  rowValue: { fontSize: 12, color: colors.text, flexShrink: 1, textAlign: "right" },
  description: { fontSize: 13, color: colors.text, marginTop: spacing.sm, lineHeight: 19 },
  imagesRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  image: { width: 80, height: 80, borderRadius: radius.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: spacing.sm,
  },
  actionButton: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 10, alignItems: "center" },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 13 },
  timelineRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  timelineStatus: { fontSize: 12, fontWeight: "700", color: colors.navy },
  timelineDate: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  timelineRemarks: { fontSize: 12, color: colors.text, marginTop: 4 },
});
