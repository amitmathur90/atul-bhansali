import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, View } from "react-native";
import { AdminFeedModerationScreen } from "../screens/Admin/AdminFeedModerationScreen";
import { CreatePosterScreen } from "../screens/Feed/CreatePosterScreen";
import { FeedListScreen } from "../screens/Feed/FeedListScreen";
import { HashtagPostsScreen } from "../screens/Feed/HashtagPostsScreen";
import { PostCommentsScreen } from "../screens/Feed/PostCommentsScreen";
import { SearchScreen } from "../screens/Feed/SearchScreen";
import { UserProfileScreen } from "../screens/Feed/UserProfileScreen";
import { colors } from "../theme";
import type { AdminFeedStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminFeedStackParamList>();

export function AdminFeedStack() {
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
            <View style={{ flexDirection: "row", gap: 18 }}>
              <TouchableOpacity onPress={() => navigation.navigate("Search")} hitSlop={8}>
                <Ionicons name="search" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("AdminFeedModeration")} hitSlop={8}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
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
      <Stack.Screen name="CreatePoster" component={CreatePosterScreen} options={{ title: "पोस्टर बनाएं" }} />
      <Stack.Screen
        name="AdminFeedModeration"
        component={AdminFeedModerationScreen}
        options={{ title: "फ़ीड प्रबंधन" }}
      />
    </Stack.Navigator>
  );
}
