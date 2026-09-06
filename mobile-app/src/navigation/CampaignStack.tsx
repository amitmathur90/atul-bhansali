import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CampaignScreen } from "../screens/Campaign/CampaignScreen";
import { colors } from "../theme";
import type { CampaignStackParamList } from "./types";

const Stack = createNativeStackNavigator<CampaignStackParamList>();

export function CampaignStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="Campaign" component={CampaignScreen} options={{ title: "चुनाव अभियान" }} />
    </Stack.Navigator>
  );
}
