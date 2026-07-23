import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../theme";
import { ContactMlaScreen } from "../screens/ContactMla/ContactMlaScreen";
import { EmergencyContactsScreen } from "../screens/EmergencyContacts/EmergencyContactsScreen";
import { MoreScreen } from "../screens/More/MoreScreen";
import { NotificationsScreen } from "../screens/Notifications/NotificationsScreen";
import type { ProfileStackParamList } from "./types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="MoreMenu" component={MoreScreen} options={{ title: "मेरा प्रोफाइल" }} />
      <Stack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}
        options={{ title: "आपातकालीन संपर्क" }}
      />
      <Stack.Screen name="ContactMla" component={ContactMlaScreen} options={{ title: "कार्यालय संपर्क" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "सूचनाएं" }} />
    </Stack.Navigator>
  );
}
