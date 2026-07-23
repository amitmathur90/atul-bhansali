import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Replace these two files (same filenames) to update the photos — no code change
// needed, just overwrite the files and reload.
const mlaPhoto = require("../../assets/mla-photo.png");
const heroBackground = require("../../assets/home-page-bg.png");
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { HomeStackParamList, MainTabParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, "Home">,
  BottomTabScreenProps<MainTabParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.navigate("ProfileTab", { screen: "MoreMenu" })}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>जय जोधपुर</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("ProfileTab", { screen: "Notifications" })}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.profileWrap}>
          <ImageBackground source={heroBackground} style={styles.heroBackground} resizeMode="cover">
            <View style={styles.heroOverlay} />
          </ImageBackground>
          <View style={[styles.avatarRing, styles.avatarOverlap]}>
            <Image source={mlaPhoto} style={styles.avatar} resizeMode="cover" />
          </View>
          <Text style={styles.name}>अतुल भंसाली</Text>
          <Text style={styles.designation}>MLA, जोधपुर</Text>
          <Text style={styles.tagline}>जनसेवा ही मेरा धर्म हैं</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("ComplaintTab", { screen: "NewComplaint" })}
        >
          <Ionicons name="document-text" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>शिकायत दर्ज करें</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("ComplaintTab", { screen: "MyComplaints" })}
        >
          <Ionicons name="list" size={18} color="#fff" />
          <Text style={styles.secondaryButtonText}>मेरी शिकायतें देखें</Text>
        </TouchableOpacity>

        <View style={styles.iconRow}>
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => navigation.navigate("ProfileTab", { screen: "EmergencyContacts" })}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${colors.danger}15`, borderWidth: 1.5, borderColor: colors.danger }]}>
              <Text style={[styles.sosText, { color: colors.danger }]}>SOS</Text>
            </View>
            <Text style={styles.iconLabel}>आपातकालीन सहायता</Text>
          </TouchableOpacity>
          <IconAction
            label="कार्यालय संपर्क करें"
            icon="call"
            color={colors.success}
            onPress={() => navigation.navigate("ProfileTab", { screen: "ContactMla" })}
          />
          <IconAction
            label="विकास कार्य देखें"
            icon="business"
            color={colors.saffron}
            onPress={() => navigation.navigate("DevelopmentWorksList")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function IconAction({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.iconAction} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.iconLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40, alignItems: "center" },
  profileWrap: { alignItems: "center", alignSelf: "stretch", marginBottom: spacing.xl },
  heroBackground: {
    height: 220,
    alignSelf: "stretch",
    marginTop: -spacing.lg,
    marginHorizontal: -spacing.lg,
  },
  heroOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.navy,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarOverlap: { marginTop: -56 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: `${colors.navy}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 19, fontWeight: "700", color: colors.navy },
  designation: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  tagline: { fontSize: 13, color: colors.saffronDark, fontWeight: "600", marginTop: spacing.sm },
  primaryButton: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    ...shadow.card,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.saffron,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: spacing.md,
    ...shadow.card,
  },
  secondaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  iconAction: { width: "30%", alignItems: "center" },
  sosText: { fontSize: 13, fontWeight: "800" },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  iconLabel: { fontSize: 11, color: colors.text, textAlign: "center", fontWeight: "500" },
});
