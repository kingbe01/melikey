import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import type { ComponentProps } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "../notifications/NotificationsContext";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import CreateLikeyScreen from "../screens/main/CreateLikeyScreen";
import FriendLikeysView from "../screens/main/FriendLikeysView";
import HomeFeedScreen from "../screens/main/HomeFeedScreen";
import LikeyDetailScreen from "../screens/main/LikeyDetailScreen";
import OtherScreen from "../screens/main/OtherScreen";
import PeopleScreen from "../screens/main/PeopleScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import ServicesScreen from "../screens/main/ServicesScreen";
import { colors } from "../theme/colors";

export type MainTabParamList = {
  Feed: undefined;
  CreateLikey: undefined;
  Other: undefined;
  People: undefined;
  Services: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Notifications: undefined;
  FriendLikeys: { id: string; username: string };
  LikeyDetail: { likeyId: string };
};

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<keyof MainTabParamList, { focused: IoniconName; unfocused: IoniconName }> = {
  Feed: { focused: "location", unfocused: "location-outline" },
  CreateLikey: { focused: "add-circle", unfocused: "add-circle-outline" },
  Other: { focused: "book", unfocused: "book-outline" },
  People: { focused: "people", unfocused: "people-outline" },
  Services: { focused: "construct", unfocused: "construct-outline" },
  Profile: { focused: "person-circle", unfocused: "person-circle-outline" },
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function NotificationBell() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      style={styles.bellButton}
      onPress={() => navigation.getParent<NativeStackNavigationProp<MainStackParamList>>()?.navigate("Notifications")}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.text} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const icon = TAB_ICONS[route.name as keyof MainTabParamList];
          return <Ionicons name={focused ? icon.focused : icon.unfocused} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // Without this the tab bar stays put and the keyboard covers it —
        // there's no way to tell it's still there, let alone reach it.
        tabBarHideOnKeyboard: true,
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
        headerRight: () => <NotificationBell />,
      })}
    >
      <Tab.Screen name="Feed" component={HomeFeedScreen} options={{ title: "Places" }} />
      <Tab.Screen name="Services" component={ServicesScreen} options={{ title: "Services" }} />
      <Tab.Screen name="CreateLikey" component={CreateLikeyScreen} options={{ title: "Post Likey" }} />
      <Tab.Screen name="Other" component={OtherScreen} options={{ title: "Other" }} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Me" }} />
    </Tab.Navigator>
  );
}

function FriendLikeysScreen({ route, navigation }: NativeStackScreenProps<MainStackParamList, "FriendLikeys">) {
  const insets = useSafeAreaInsets();
  return <FriendLikeysView user={route.params} onBack={() => navigation.goBack()} topInset={insets.top} />;
}

function LikeyDetailStackScreen({ route, navigation }: NativeStackScreenProps<MainStackParamList, "LikeyDetail">) {
  return <LikeyDetailScreen likeyId={route.params.likeyId} onBack={() => navigation.goBack()} />;
}

export default function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="FriendLikeys" component={FriendLikeysScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LikeyDetail" component={LikeyDetailStackScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogo: { width: 84, height: 32, marginLeft: 16 },
  bellButton: { marginRight: 16, padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.surface, fontSize: 10, fontWeight: "700" },
});
