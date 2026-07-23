import { NavigationContainer } from "@react-navigation/native";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { registerForPushNotifications } from "../lib/notifications";
import { useAuthStore } from "../store/authStore";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";

export function RootNavigator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useOfflineSync();

  useEffect(() => {
    if (accessToken) {
      registerForPushNotifications();
    }
  }, [accessToken]);

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <NavigationContainer>{accessToken ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}
