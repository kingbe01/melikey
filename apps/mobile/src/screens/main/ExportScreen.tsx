import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import type { LikeyCategory } from "../../lib/api";
import { exportLikeys, type ExportScope } from "../../lib/exportLikeys";
import { colors } from "../../theme/colors";

const SCOPES: { value: ExportScope; label: string }[] = [
  { value: "mine", label: "Mine" },
  { value: "friends", label: "Friends" },
  { value: "both", label: "Both" },
];

const CATEGORIES: { value: LikeyCategory; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "entertainment", label: "Entertainment" },
  { value: "general", label: "General" },
  { value: "media", label: "Other" },
];

export default function ExportScreen({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();

  const [scope, setScope] = useState<ExportScope>("mine");
  const [categories, setCategories] = useState<Set<LikeyCategory>>(
    () => new Set(["restaurant", "entertainment", "general", "media"])
  );
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (value: LikeyCategory) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const canExport = !isExporting && categories.size > 0;

  const onExport = async () => {
    if (!token || !canExport) return;
    setError(null);
    setIsExporting(true);
    try {
      await exportLikeys(token, scope, [...categories]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Export data</Text>
      <Text style={styles.subtitle}>Export Likeys as a spreadsheet you can save or share.</Text>

      <Text style={styles.section}>Whose Likeys</Text>
      <View style={styles.chipRow}>
        {SCOPES.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, scope === s.value && styles.chipSelected]}
            onPress={() => setScope(s.value)}
          >
            <Text style={scope === s.value ? styles.chipTextSelected : undefined}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Categories</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => {
          const isSelected = categories.has(c.value);
          return (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleCategory(c.value)}
            >
              <Text style={isSelected ? styles.chipTextSelected : undefined}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {categories.size === 0 ? <Text style={styles.error}>Pick at least one category</Text> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={isExporting ? "Exporting..." : "Export as Excel"}
        onPress={onExport}
        disabled={!canExport}
        loading={isExporting}
        style={styles.exportButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "600", color: colors.text, marginBottom: 4 },
  subtitle: { color: colors.textMuted, marginBottom: 16 },
  section: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 8, marginTop: 8 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipTextSelected: { color: colors.primaryDark, fontWeight: "600" },
  error: { color: colors.danger, marginTop: 8 },
  exportButton: { marginTop: 24 },
});
