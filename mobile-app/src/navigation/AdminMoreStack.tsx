import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminAnnouncementsScreen } from "../screens/Admin/AdminAnnouncementsScreen";
import { AdminCampaignScreen } from "../screens/Admin/AdminCampaignScreen";
import { AdminCategoriesScreen } from "../screens/Admin/AdminCategoriesScreen";
import { AdminDepartmentsScreen } from "../screens/Admin/AdminDepartmentsScreen";
import { AdminMoreMenuScreen } from "../screens/Admin/AdminMoreMenuScreen";
import { AdminReportsScreen } from "../screens/Admin/AdminReportsScreen";
import { AdminSettingsScreen } from "../screens/Admin/AdminSettingsScreen";
import { AdminStaffScreen } from "../screens/Admin/AdminStaffScreen";
import { AdminWardsScreen } from "../screens/Admin/AdminWardsScreen";
import { colors } from "../theme";
import type { AdminMoreStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminMoreStackParamList>();

export function AdminMoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.navy }, headerTintColor: "#fff" }}>
      <Stack.Screen name="AdminMoreMenu" component={AdminMoreMenuScreen} options={{ title: "और" }} />
      <Stack.Screen name="AdminWards" component={AdminWardsScreen} options={{ title: "वार्ड" }} />
      <Stack.Screen name="AdminDepartments" component={AdminDepartmentsScreen} options={{ title: "विभाग" }} />
      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} options={{ title: "श्रेणियां" }} />
      <Stack.Screen name="AdminStaff" component={AdminStaffScreen} options={{ title: "स्टाफ प्रबंधन" }} />
      <Stack.Screen
        name="AdminAnnouncements"
        component={AdminAnnouncementsScreen}
        options={{ title: "घोषणाएं / नोटिस" }}
      />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: "सेटिंग्स" }} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} options={{ title: "रिपोर्ट्स" }} />
      <Stack.Screen name="AdminCampaign" component={AdminCampaignScreen} options={{ title: "चुनाव अभियान" }} />
    </Stack.Navigator>
  );
}
