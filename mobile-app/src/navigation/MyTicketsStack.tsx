import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../theme";
import { ComplaintDetailScreen } from "../screens/Complaints/ComplaintDetailScreen";
import { MyComplaintsScreen } from "../screens/Complaints/MyComplaintsScreen";
import { NewComplaintScreen } from "../screens/Complaints/NewComplaintScreen";
import type { MyTicketsStackParamList } from "./types";

const Stack = createNativeStackNavigator<MyTicketsStackParamList>();

export function MyTicketsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="MyComplaints" component={MyComplaintsScreen} options={{ title: "मेरी शिकायतें" }} />
      <Stack.Screen
        name="NewComplaint"
        component={NewComplaintScreen}
        options={{ title: "नई शिकायत दर्ज करें" }}
      />
      <Stack.Screen
        name="ComplaintDetail"
        component={ComplaintDetailScreen}
        options={{ title: "शिकायत विवरण" }}
      />
    </Stack.Navigator>
  );
}
