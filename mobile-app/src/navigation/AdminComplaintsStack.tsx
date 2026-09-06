import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminComplaintDetailScreen } from "../screens/Admin/AdminComplaintDetailScreen";
import { AdminComplaintsListScreen } from "../screens/Admin/AdminComplaintsListScreen";
import { colors } from "../theme";
import type { AdminComplaintsStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminComplaintsStackParamList>();

export function AdminComplaintsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: "#fff" }}>
      <Stack.Screen
        name="AdminComplaintsList"
        component={AdminComplaintsListScreen}
        options={{ title: "शिकायतें" }}
      />
      <Stack.Screen
        name="AdminComplaintDetail"
        component={AdminComplaintDetailScreen}
        options={{ title: "शिकायत विवरण" }}
      />
    </Stack.Navigator>
  );
}
