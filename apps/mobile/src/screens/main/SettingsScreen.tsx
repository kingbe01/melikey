import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import { colors } from "../../theme/colors";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { user, updateUsername, updateDefaultRadiusMiles, deleteAccount } = useAuth();
  const [isSaving, setIsSaving] = useState<number | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [username, setUsername] = useState(user?.username ?? "");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const trimmedUsername = username.trim();
  const isUsernameValid =
    trimmedUsername.length >= 3 && trimmedUsername.length <= 24 && USERNAME_REGEX.test(trimmedUsername);
  const canSaveUsername = isUsernameValid && trimmedUsername !== user?.username && !isSavingUsername;

  const onSaveUsername = async () => {
    if (!canSaveUsername) return;
    setUsernameError(null);
    setIsSavingUsername(true);
    try {
      await updateUsername(trimmedUsername);
    } catch (e) {
      setUsernameError(e instanceof Error ? e.message : "Couldn't save username");
    } finally {
      setIsSavingUsername(false);
    }
  };

  const onDeleteAccount = () => {
    if (!deletePassword) return;
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your account and everything you've posted. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteError(null);
            setIsDeletingAccount(true);
            try {
              await deleteAccount(deletePassword);
            } catch (e) {
              setDeleteError(e instanceof Error ? e.message : "Couldn't delete account");
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

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
      <TouchableOpacity style={[styles.backRow, { marginTop: insets.top }]} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Settings</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>Username</Text>
      <View style={styles.usernameRow}>
        <TextInput
          style={[styles.input, styles.usernameInput]}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          maxLength={24}
          value={username}
          onChangeText={setUsername}
        />
        <Button label="Save" small loading={isSavingUsername} disabled={!canSaveUsername} onPress={onSaveUsername} />
      </View>
      {usernameError ? <Text style={styles.error}>{usernameError}</Text> : null}

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

      <Text style={[styles.section, styles.dangerSection]}>Delete account</Text>
      <Text style={styles.subtitle}>
        Permanently deletes your account and everything you've posted. This can't be undone.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your password to confirm"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={deletePassword}
        onChangeText={setDeletePassword}
      />
      {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
      <Button
        label="Delete Account"
        variant="danger"
        loading={isDeletingAccount}
        disabled={!deletePassword}
        style={styles.deleteButton}
        onPress={onDeleteAccount}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  scrollContent: { paddingBottom: 48 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "600", color: colors.text, marginBottom: 16 },
  section: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  subtitle: { color: colors.textMuted, marginBottom: 12 },
  usernameRow: { flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  usernameInput: { flex: 1 },
  error: { color: colors.danger, marginBottom: 16, marginTop: -8 },
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
  dangerSection: { marginTop: 32 },
  deleteButton: { marginTop: 4 },
});
