import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Image, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { apiClient } from "../lib/api-client";
import { colors, spacing } from "../theme";

interface AppBanner {
  id: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export function AppBannerPopup() {
  const { data: banner } = useQuery({
    queryKey: ["app-banner-active"],
    queryFn: async () => (await apiClient.get<{ banner: AppBanner | null }>("/app-banners/active")).data.banner,
    staleTime: Infinity,
    retry: false,
  });

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // A new banner id showing up (e.g. admin activated a different one while the
    // app was already open) should be shown again even if an older one was closed.
    setDismissed(false);
  }, [banner?.id]);

  const visible = !!banner && !dismissed;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {banner && (
            <Image
              source={{ uri: banner.imageUrl }}
              style={[styles.image, { aspectRatio: banner.imageWidth / banner.imageHeight }]}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity style={styles.closeButton} onPress={() => setDismissed(true)} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 480,
  },
  image: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  closeButton: {
    position: "absolute",
    top: -44,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    padding: spacing.xs,
  },
});
