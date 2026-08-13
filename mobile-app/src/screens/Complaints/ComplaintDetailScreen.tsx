import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiClient } from "../../lib/api-client";
import type { MyTicketsStackParamList } from "../../navigation/types";

const TIMELINE_STAGES = ["RECEIVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"] as const;

type Props = NativeStackScreenProps<MyTicketsStackParamList, "ComplaintDetail">;

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  remarks: string | null;
  createdAt: string;
}

interface ComplaintDetail {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  address: string;
  category: { name: string };
  ward: { name: string; wardNumber: number };
  assignedStaff: { name: string; phone: string | null; designation: string | null } | null;
  images: { id: string; url: string }[];
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
}

interface Feedback {
  id: string;
  rating: number;
  comment: string | null;
  satisfied: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#64748b",
  ASSIGNED: "#2563eb",
  IN_PROGRESS: "#d97706",
  COMPLETED: "#16a34a",
  REJECTED: "#dc2626",
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "शिकायत प्राप्त हुई",
  ASSIGNED: "अधिकारी को सौंपा गया",
  IN_PROGRESS: "कार्य प्रगति में है",
  COMPLETED: "समाधान पूर्ण",
  REJECTED: "रद्द",
};

export function ComplaintDetailScreen({ route }: Props) {
  const { id } = route.params;

  const { data: complaint, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => (await apiClient.get<ComplaintDetail>(`/complaints/${id}`)).data,
  });

  const { data: feedback } = useQuery({
    queryKey: ["complaint-feedback", id],
    queryFn: async () => (await apiClient.get<Feedback | null>(`/complaints/${id}/feedback`)).data,
    enabled: complaint?.status === "COMPLETED",
  });

  if (isLoading || !complaint) {
    return (
      <View style={styles.center}>
        <Text>लोड हो रहा है…</Text>
      </View>
    );
  }

  const reachedStages = new Set(complaint.statusHistory.map((h) => h.toStatus));
  const stageTimestamps = Object.fromEntries(
    complaint.statusHistory.map((h) => [h.toStatus, h.createdAt]),
  );
  const isRejected = complaint.status === "REJECTED";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.complaintNumber}>{complaint.complaintNumber}</Text>
        <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLORS[complaint.status]}20` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[complaint.status] }]}>
            {STATUS_LABELS[complaint.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.title}>{complaint.title}</Text>
      <Text style={styles.metaLine}>📍 {complaint.address}</Text>
      <Text style={styles.metaLine}>
        🕐 {new Date(complaint.createdAt).toLocaleDateString()} |{" "}
        {new Date(complaint.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>

      <Text style={styles.description}>{complaint.description}</Text>

      <View style={styles.metaBlock}>
        <MetaRow label="श्रेणी" value={complaint.category.name} />
        <MetaRow label="वार्ड" value={`वार्ड ${complaint.ward.wardNumber} — ${complaint.ward.name}`} />
      </View>

      {complaint.images.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>तस्वीरें</Text>
          <View style={styles.imagesRow}>
            {complaint.images.map((img) => (
              <Image key={img.id} source={{ uri: img.url }} style={styles.thumbnail} />
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>स्थिति (Status Timeline)</Text>
      {isRejected ? (
        <View style={styles.timelineItem}>
          <Text style={styles.timelineIcon}>✕</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineStatus}>यह शिकायत रद्द कर दी गई है</Text>
          </View>
        </View>
      ) : (
        TIMELINE_STAGES.map((stage) => {
          const reached = reachedStages.has(stage);
          const isCurrent = complaint.status === stage;
          return (
            <View key={stage} style={styles.timelineItem}>
              <Text style={[styles.timelineIcon, { color: reached ? STATUS_COLORS[stage] : "#ccc" }]}>
                {reached ? "✓" : "○"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.timelineStatus, !reached && styles.timelineStatusPending]}>
                  {STATUS_LABELS[stage]}
                </Text>
                <Text style={styles.timelineDate}>
                  {reached
                    ? new Date(stageTimestamps[stage]).toLocaleString()
                    : isCurrent
                      ? ""
                      : "आने वाला है"}
                </Text>
              </View>
            </View>
          );
        })
      )}

      {complaint.assignedStaff && (
        <>
          <Text style={styles.sectionTitle}>अधिकारी विवरण</Text>
          <View style={styles.officerCard}>
            <View style={styles.officerAvatar}>
              <Text style={styles.officerAvatarText}>{complaint.assignedStaff.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.officerDept}>{complaint.assignedStaff.designation ?? "अधिकारी"}</Text>
              <Text style={styles.officerName}>{complaint.assignedStaff.name}</Text>
            </View>
            {complaint.assignedStaff.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${complaint.assignedStaff!.phone}`)}
              >
                <Text style={styles.callButtonText}>📞</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {complaint.status === "COMPLETED" && (
        <>
          <Text style={styles.sectionTitle}>फीडबैक</Text>
          {feedback ? <FeedbackSummary feedback={feedback} /> : <FeedbackForm complaintId={complaint.id} />}
        </>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FeedbackSummary({ feedback }: { feedback: Feedback }) {
  return (
    <View style={styles.feedbackCard}>
      <Text style={styles.stars}>{"★".repeat(feedback.rating)}{"☆".repeat(5 - feedback.rating)}</Text>
      <Text style={styles.feedbackSatisfied}>{feedback.satisfied ? "संतुष्ट" : "असंतुष्ट"}</Text>
      {feedback.comment && <Text style={styles.feedbackComment}>{feedback.comment}</Text>}
    </View>
  );
}

function FeedbackForm({ complaintId }: { complaintId: string }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [satisfied, setSatisfied] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/complaints/${complaintId}/feedback`, { rating, satisfied, comment: comment || undefined }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["complaint-feedback", complaintId] });
    },
    onError: () => setError("फीडबैक भेजा नहीं जा सका। कृपया पुनः प्रयास करें।"),
  });

  return (
    <View style={styles.feedbackCard}>
      <Text style={styles.feedbackPrompt}>आपका अनुभव कैसा रहा?</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={styles.starButton}>{n <= rating ? "★" : "☆"}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.satisfiedRow}>
        <TouchableOpacity
          style={[styles.satisfiedButton, satisfied === true && styles.satisfiedButtonActive]}
          onPress={() => setSatisfied(true)}
        >
          <Text style={satisfied === true ? styles.satisfiedTextActive : styles.satisfiedText}>संतुष्ट</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.satisfiedButton, satisfied === false && styles.satisfiedButtonActive]}
          onPress={() => setSatisfied(false)}
        >
          <Text style={satisfied === false ? styles.satisfiedTextActive : styles.satisfiedText}>
            असंतुष्ट
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.commentInput}
        placeholder="टिप्पणी (वैकल्पिक)"
        value={comment}
        onChangeText={setComment}
        multiline
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity
        style={styles.submitButton}
        disabled={rating === 0 || satisfied === null || submitMutation.isPending}
        onPress={() => submitMutation.mutate()}
      >
        {submitMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>फीडबैक दें</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 60 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  complaintNumber: { fontSize: 12, color: "#666", fontWeight: "600" },
  title: { fontSize: 19, fontWeight: "700", marginTop: 4 },
  metaLine: { fontSize: 13, color: "#666", marginTop: 6 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  description: { fontSize: 14, color: "#444", marginTop: 16, lineHeight: 20 },
  metaBlock: { marginTop: 20, gap: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { fontSize: 13, color: "#888" },
  metaValue: { fontSize: 13, color: "#222", fontWeight: "500", flexShrink: 1, textAlign: "right" },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 24, marginBottom: 10 },
  imagesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  timelineItem: { flexDirection: "row", gap: 10, marginBottom: 14, alignItems: "flex-start" },
  timelineIcon: { fontSize: 16, fontWeight: "700", width: 20, textAlign: "center", marginTop: 2 },
  timelineStatus: { fontSize: 13, fontWeight: "700", color: "#222" },
  timelineStatusPending: { color: "#999", fontWeight: "500" },
  timelineDate: { fontSize: 11, color: "#999", marginTop: 2 },
  timelineRemarks: { fontSize: 13, color: "#444", marginTop: 4 },
  officerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f4f4f8",
    borderRadius: 10,
    padding: 14,
  },
  officerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5821F20",
    alignItems: "center",
    justifyContent: "center",
  },
  officerAvatarText: { fontSize: 16, fontWeight: "700", color: "#F5821F" },
  officerDept: { fontSize: 11, color: "#888" },
  officerName: { fontSize: 14, fontWeight: "600", color: "#222" },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5821F",
    alignItems: "center",
    justifyContent: "center",
  },
  callButtonText: { fontSize: 15 },
  feedbackCard: { backgroundColor: "#f4f4f8", borderRadius: 10, padding: 16 },
  feedbackPrompt: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  starsRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  starButton: { fontSize: 30, color: "#f59e0b" },
  stars: { fontSize: 24, color: "#f59e0b" },
  satisfiedRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  satisfiedButton: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  satisfiedButtonActive: { backgroundColor: "#F5821F", borderColor: "#F5821F" },
  satisfiedText: { color: "#444", fontWeight: "600" },
  satisfiedTextActive: { color: "#fff", fontWeight: "600" },
  feedbackSatisfied: { fontSize: 13, color: "#444", fontWeight: "600", marginTop: 4 },
  feedbackComment: { fontSize: 13, color: "#555", marginTop: 8 },
  commentInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, minHeight: 60, textAlignVertical: "top", backgroundColor: "#fff" },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 8 },
  submitButton: { backgroundColor: "#F5821F", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  submitButtonText: { color: "#fff", fontWeight: "700" },
});
