import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FeedListScreen } from "../screens/Feed/FeedListScreen";
import { PostCommentsScreen } from "../screens/Feed/PostCommentsScreen";
import { colors } from "../theme";
import type { FeedStackParamList } from "./types";

const Stack = createNativeStackNavigator<FeedStackParamList>();

export function FeedStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen name="FeedList" component={FeedListScreen} options={{ title: "सिटीज़न फ़ीड" }} />
      <Stack.Screen name="PostComments" component={PostCommentsScreen} options={{ title: "टिप्पणियां" }} />
    </Stack.Navigator>
  );
}
