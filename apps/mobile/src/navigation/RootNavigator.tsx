import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { navigateForNotificationData } from "../notifications/notificationNavigation";
import { colors } from "../theme/colors";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import { navigationRef } from "./navigationRef";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [isNavReady, setIsNavReady] = useState(false);

  // Handles the app being launched fresh by tapping a push notification —
  // the response listener in NotificationsContext only catches taps while
  // already running, so a cold start needs this instead.
  useEffect(() => {
    if (!isNavReady) return;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) navigateForNotificationData(response.notification.request.content.data);
    });
  }, [isNavReady]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={() => setIsNavReady(true)}>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
