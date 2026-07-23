import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OtpVerifyScreen } from "../screens/Auth/OtpVerifyScreen";
import { PhoneEntryScreen } from "../screens/Auth/PhoneEntryScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ headerShown: true, title: "" }} />
    </Stack.Navigator>
  );
}
