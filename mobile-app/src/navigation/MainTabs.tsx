import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme";
import { HomeStack } from "./HomeStack";
import { MyTicketsStack } from "./MyTicketsStack";
import { NoticeStack } from "./NoticeStack";
import { ProfileStack } from "./ProfileStack";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focusedName: IconName, unfocusedName: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? focusedName : unfocusedName} color={color} size={size} />
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: "होम", tabBarIcon: tabIcon("home", "home-outline") }}
      />
      <Tab.Screen
        name="ComplaintTab"
        component={MyTicketsStack}
        options={{ title: "शिकायत", tabBarIcon: tabIcon("document-text", "document-text-outline") }}
      />
      <Tab.Screen
        name="NoticeTab"
        component={NoticeStack}
        options={{ title: "नोटिस", tabBarIcon: tabIcon("notifications", "notifications-outline") }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ title: "प्रोफाइल", tabBarIcon: tabIcon("person", "person-outline") }}
      />
    </Tab.Navigator>
  );
}
