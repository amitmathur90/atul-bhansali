import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../theme";
import { AnnouncementDetailScreen } from "../screens/Announcements/AnnouncementDetailScreen";
import { AnnouncementsListScreen } from "../screens/Announcements/AnnouncementsListScreen";
import type { NoticeStackParamList } from "./types";

const Stack = createNativeStackNavigator<NoticeStackParamList>();

export function NoticeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen
        name="AnnouncementsList"
        component={AnnouncementsListScreen}
        options={{ title: "सूचनाएं और अपडेट" }}
      />
      <Stack.Screen
        name="AnnouncementDetail"
        component={AnnouncementDetailScreen}
        options={{ title: "सूचना" }}
      />
    </Stack.Navigator>
  );
}
