import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { FeedListScreen } from "../screens/Feed/FeedListScreen";
import { HashtagPostsScreen } from "../screens/Feed/HashtagPostsScreen";
import { PostCommentsScreen } from "../screens/Feed/PostCommentsScreen";
import { SearchScreen } from "../screens/Feed/SearchScreen";
import { UserProfileScreen } from "../screens/Feed/UserProfileScreen";
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
      <Stack.Screen
        name="FeedList"
        component={FeedListScreen}
        options={({ navigation }) => ({
          title: "सिटीज़न फ़ीड",
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate("Search")} hitSlop={8}>
              <Ionicons name="search" size={22} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="PostComments" component={PostCommentsScreen} options={{ title: "टिप्पणियां" }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "प्रोफाइल" }} />
      <Stack.Screen
        name="HashtagPosts"
        component={HashtagPostsScreen}
        options={({ route }) => ({ title: `#${route.params.tag}` })}
      />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: "खोजें" }} />
    </Stack.Navigator>
  );
}
