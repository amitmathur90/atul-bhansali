import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminDashboardScreen } from "../screens/Admin/AdminDashboardScreen";
import { colors } from "../theme";
import type { AdminDashboardStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminDashboardStackParamList>();

export function AdminDashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: "#fff" }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "डैशबोर्ड" }} />
    </Stack.Navigator>
  );
}
