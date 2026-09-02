import { Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.username}</Text>
      <Text>{user?.email}</Text>
      <Button title="Log out" onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
});
