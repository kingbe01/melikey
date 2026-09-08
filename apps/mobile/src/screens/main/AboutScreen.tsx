import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../theme/colors";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function AboutScreen({ onBack }: { onBack: () => void }) {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber = Constants.expoConfig?.ios?.buildNumber;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Me</Text>
      </TouchableOpacity>
      <Text style={styles.title}>About melikey</Text>

      <Text style={styles.subtitle}>
        melikey is a closed-graph social app for real-time recommendations from people you follow — search and
        follow people you know, then get a geolocated feed of restaurant and entertainment picks near you, right
        now.
      </Text>

      <Text style={styles.section}>Legal</Text>
      <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`${API_URL}/privacy`)}>
        <Text style={styles.rowText}>Privacy Policy</Text>
        <Ionicons name="open-outline" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`${API_URL}/terms`)}>
        <Text style={styles.rowText}>Terms of Service</Text>
        <Ionicons name="open-outline" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.version}>
        Version {version}
        {buildNumber ? ` (${buildNumber})` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "600", color: colors.text, marginBottom: 12 },
  subtitle: { color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
  section: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { fontSize: 15, color: colors.text },
  version: { color: colors.textMuted, fontSize: 13, marginTop: 24, textAlign: "center" },
});
