import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme";
import { AdminComplaintsStack } from "./AdminComplaintsStack";
import { AdminDashboardStack } from "./AdminDashboardStack";
import { AdminMoreStack } from "./AdminMoreStack";
import type { AdminTabParamList } from "./types";

const Tab = createBottomTabNavigator<AdminTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focusedName: IconName, unfocusedName: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? focusedName : unfocusedName} color={color} size={size} />
  );
}

export function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tab.Screen
        name="AdminDashboardTab"
        component={AdminDashboardStack}
        options={{ title: "डैशबोर्ड", tabBarIcon: tabIcon("grid", "grid-outline") }}
      />
      <Tab.Screen
        name="AdminComplaintsTab"
        component={AdminComplaintsStack}
        options={{ title: "शिकायतें", tabBarIcon: tabIcon("document-text", "document-text-outline") }}
      />
      <Tab.Screen
        name="AdminMoreTab"
        component={AdminMoreStack}
        options={{ title: "और", tabBarIcon: tabIcon("menu", "menu-outline") }}
      />
    </Tab.Navigator>
  );
}
