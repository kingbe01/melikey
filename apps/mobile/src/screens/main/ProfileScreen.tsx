import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../theme/colors";
import SettingsScreen from "./SettingsScreen";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.username}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <TouchableOpacity style={styles.button} onPress={() => setShowSettings(true)}>
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => logout()}>
        <Text style={styles.buttonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.background,
  },
  title: { fontSize: 20, fontWeight: "600", color: colors.text },
  email: { color: colors.textMuted },
  button: {
    marginTop: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: { color: colors.primaryDark, fontWeight: "600" },
});
