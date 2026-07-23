import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiClient } from "./api-client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Requests permission, grabs an Expo push token, and registers it with the backend.
// Silently no-ops on simulators/emulators (no physical push capability) or if the
// user declines the permission prompt — this is best-effort, not a blocking gate.
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await apiClient.post("/notifications/register-device", {
      token,
      platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    });
  } catch {
    // Network hiccup or no projectId configured for a bare workflow — not fatal, the
    // app still works, just without push delivery until the next successful attempt.
  }
}
