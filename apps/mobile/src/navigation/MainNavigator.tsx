import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { ComponentProps } from "react";
import { Image, StyleSheet } from "react-native";
import CreateLikeyScreen from "../screens/main/CreateLikeyScreen";
import HomeFeedScreen from "../screens/main/HomeFeedScreen";
import PeopleScreen from "../screens/main/PeopleScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import { colors } from "../theme/colors";

export type MainTabParamList = {
  Feed: undefined;
  CreateLikey: undefined;
  People: undefined;
  Profile: undefined;
};

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<keyof MainTabParamList, { focused: IoniconName; unfocused: IoniconName }> = {
  Feed: { focused: "location", unfocused: "location-outline" },
  CreateLikey: { focused: "add-circle", unfocused: "add-circle-outline" },
  People: { focused: "people", unfocused: "people-outline" },
  Profile: { focused: "person-circle", unfocused: "person-circle-outline" },
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const icon = TAB_ICONS[route.name as keyof MainTabParamList];
          return <Ionicons name={focused ? icon.focused : icon.unfocused} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerLeft: () => (
          <Image
            source={require("../../assets/images/header-logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        ),
      })}
    >
      <Tab.Screen name="Feed" component={HomeFeedScreen} options={{ title: "Places" }} />
      <Tab.Screen name="CreateLikey" component={CreateLikeyScreen} options={{ title: "Post a Likey" }} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Me" }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogo: { width: 84, height: 32, marginLeft: 16 },
});
