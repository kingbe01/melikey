import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../theme/colors";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { user, updateDefaultRadiusMiles } = useAuth();
  const [isSaving, setIsSaving] = useState<number | null>(null);

  const onSelectRadius = async (radiusMiles: number) => {
    if (radiusMiles === user?.defaultRadiusMiles) return;
    setIsSaving(radiusMiles);
    try {
      await updateDefaultRadiusMiles(radiusMiles);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Me</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>Default search radius</Text>
      <Text style={styles.subtitle}>
        How far to look for nearby places when posting a Likey, and how far the Places feed searches
        around a location.
      </Text>
      <View style={styles.chipRow}>
        {RADIUS_OPTIONS.map((radius) => {
          const isSelected = user?.defaultRadiusMiles === radius;
          return (
            <TouchableOpacity
              key={radius}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectRadius(radius)}
              disabled={isSaving !== null}
            >
              {isSaving === radius ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Text style={isSelected ? styles.chipTextSelected : undefined}>{radius} mi</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "600", color: colors.text, marginBottom: 16 },
  section: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  subtitle: { color: colors.textMuted, marginBottom: 12 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    minWidth: 60,
    alignItems: "center",
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipTextSelected: { color: colors.primaryDark, fontWeight: "600" },
});
