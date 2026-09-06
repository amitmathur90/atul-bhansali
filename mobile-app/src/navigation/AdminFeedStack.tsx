import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminFeedModerationScreen } from "../screens/Admin/AdminFeedModerationScreen";
import { colors } from "../theme";
import type { AdminFeedStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminFeedStackParamList>();

export function AdminFeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: "#fff" }}>
      <Stack.Screen name="AdminFeedHome" component={AdminFeedModerationScreen} options={{ title: "सिटीज़न फ़ीड" }} />
    </Stack.Navigator>
  );
}
