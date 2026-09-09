import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import { useNotifications } from "../notifications/NotificationsContext";
import AboutScreen from "../screens/main/AboutScreen";
import CreateLikeyScreen from "../screens/main/CreateLikeyScreen";
import ExportScreen from "../screens/main/ExportScreen";
import FriendLikeysView from "../screens/main/FriendLikeysView";
import HomeFeedScreen from "../screens/main/HomeFeedScreen";
import LikeyDetailScreen from "../screens/main/LikeyDetailScreen";
import MyLikeysScreen from "../screens/main/MyLikeysScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import OtherScreen from "../screens/main/OtherScreen";
import PeopleScreen from "../screens/main/PeopleScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import ServicesScreen from "../screens/main/ServicesScreen";
import SettingsScreen from "../screens/main/SettingsScreen";
import { colors } from "../theme/colors";

export type MainTabParamList = {
  Feed: undefined;
  Services: undefined;
  Other: undefined;
  CreateLikey: undefined;
  MyLikeys: undefined;
  People: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Notifications: undefined;
  Profile: undefined;
  Settings: undefined;
  Export: undefined;
  About: undefined;
  FriendLikeys: { id: string; username: string };
  LikeyDetail: { likeyId: string };
};

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<keyof MainTabParamList, { focused: IoniconName; unfocused: IoniconName }> = {
  Feed: { focused: "location", unfocused: "location-outline" },
  Services: { focused: "construct", unfocused: "construct-outline" },
  Other: { focused: "book", unfocused: "book-outline" },
  CreateLikey: { focused: "add-circle", unfocused: "add-circle-outline" },
  MyLikeys: { focused: "albums", unfocused: "albums-outline" },
  People: { focused: "people", unfocused: "people-outline" },
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function NotificationBell() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      style={styles.headerIconButton}
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

function ProfileMenuButton() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const goTo = (screen: "Profile" | "Settings" | "Export" | "About") => {
    setIsOpen(false);
    navigation.getParent<NativeStackNavigationProp<MainStackParamList>>()?.navigate(screen);
  };

  const onLogout = () => {
    setIsOpen(false);
    Alert.alert("Log out?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const insets = useSafeAreaInsets();

  return (
    <>
      <TouchableOpacity style={styles.headerIconButton} onPress={() => setIsOpen(true)}>
        <Avatar uri={user?.profilePhotoUrl ?? null} size={26} />
      </TouchableOpacity>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={[styles.menuCard, { top: insets.top + 48 }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => goTo("Profile")}>
              <Ionicons name="person-circle-outline" size={18} color={colors.text} />
              <Text style={styles.menuItemText}>View profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => goTo("Settings")}>
              <Ionicons name="settings-outline" size={18} color={colors.text} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => goTo("Export")}>
              <Ionicons name="download-outline" size={18} color={colors.text} />
              <Text style={styles.menuItemText}>Export data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => goTo("About")}>
              <Ionicons name="information-circle-outline" size={18} color={colors.text} />
              <Text style={styles.menuItemText}>About melikey</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
        headerRight: () => (
          <View style={styles.headerRightRow}>
            <NotificationBell />
            <ProfileMenuButton />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Feed" component={HomeFeedScreen} options={{ title: "Places" }} />
      <Tab.Screen name="Services" component={ServicesScreen} options={{ title: "Services" }} />
      <Tab.Screen name="Other" component={OtherScreen} options={{ title: "Other" }} />
      <Tab.Screen name="CreateLikey" component={CreateLikeyScreen} options={{ title: "Post Likey" }} />
      <Tab.Screen name="MyLikeys" component={MyLikeysScreen} options={{ title: "My Likeys" }} />
      <Tab.Screen name="People" component={PeopleScreen} />
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

function SettingsStackScreen({ navigation }: NativeStackScreenProps<MainStackParamList, "Settings">) {
  return <SettingsScreen onBack={() => navigation.goBack()} />;
}

function ExportStackScreen({ navigation }: NativeStackScreenProps<MainStackParamList, "Export">) {
  return <ExportScreen onBack={() => navigation.goBack()} />;
}

function AboutStackScreen({ navigation }: NativeStackScreenProps<MainStackParamList, "About">) {
  return <AboutScreen onBack={() => navigation.goBack()} />;
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Me" }} />
      <Stack.Screen name="Settings" component={SettingsStackScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Export" component={ExportStackScreen} options={{ headerShown: false }} />
      <Stack.Screen name="About" component={AboutStackScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FriendLikeys" component={FriendLikeysScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LikeyDetail" component={LikeyDetailStackScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerLogo: { width: 84, height: 32, marginLeft: 16 },
  headerRightRow: { flexDirection: "row", alignItems: "center", gap: 12, marginRight: 16 },
  headerIconButton: { padding: 4 },
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
  menuBackdrop: { flex: 1 },
  menuCard: {
    position: "absolute",
    right: 16,
    minWidth: 190,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  menuItemText: { fontSize: 15, color: colors.text },
  menuItemDanger: { color: colors.danger },
  menuDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});
