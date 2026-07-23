import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../theme";
import { BookAppointmentScreen } from "../screens/Appointments/BookAppointmentScreen";
import { MyAppointmentsScreen } from "../screens/Appointments/MyAppointmentsScreen";
import { DevelopmentWorkDetailScreen } from "../screens/DevelopmentWorks/DevelopmentWorkDetailScreen";
import { DevelopmentWorksListScreen } from "../screens/DevelopmentWorks/DevelopmentWorksListScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { WelfareSchemeDetailScreen } from "../screens/WelfareSchemes/WelfareSchemeDetailScreen";
import { WelfareSchemesListScreen } from "../screens/WelfareSchemes/WelfareSchemesListScreen";
import type { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="DevelopmentWorksList"
        component={DevelopmentWorksListScreen}
        options={{ title: "विकास कार्य" }}
      />
      <Stack.Screen
        name="DevelopmentWorkDetail"
        component={DevelopmentWorkDetailScreen}
        options={{ title: "कार्य विवरण" }}
      />
      <Stack.Screen
        name="WelfareSchemesList"
        component={WelfareSchemesListScreen}
        options={{ title: "सरकारी योजनाएं" }}
      />
      <Stack.Screen
        name="WelfareSchemeDetail"
        component={WelfareSchemeDetailScreen}
        options={{ title: "योजना विवरण" }}
      />
      <Stack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
        options={{ title: "मुलाकात हेतु अनुरोध" }}
      />
      <Stack.Screen
        name="MyAppointments"
        component={MyAppointmentsScreen}
        options={{ title: "मेरे अनुरोध" }}
      />
    </Stack.Navigator>
  );
}
