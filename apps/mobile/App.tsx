import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { NotificationsProvider } from "./src/notifications/NotificationsContext";

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </NotificationsProvider>
    </AuthProvider>
  );
}
