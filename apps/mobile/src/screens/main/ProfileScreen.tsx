import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import { pickOrCapturePhoto } from "../../lib/pickOrCapturePhoto";
import { colors } from "../../theme/colors";
import SettingsScreen from "./SettingsScreen";

export default function ProfileScreen() {
  const { user, logout, updateProfilePhoto } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);

  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  const onChangePhoto = async () => {
    const base64 = await pickOrCapturePhoto();
    if (!base64) return;
    setIsUpdatingPhoto(true);
    try {
      await updateProfilePhoto(base64);
    } catch (e) {
      Alert.alert("Couldn't update photo", e instanceof Error ? e.message : "Try again.");
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const onRemovePhoto = () => {
    Alert.alert("Remove profile photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setIsUpdatingPhoto(true);
          try {
            await updateProfilePhoto(null);
          } catch (e) {
            Alert.alert("Couldn't remove photo", e instanceof Error ? e.message : "Try again.");
          } finally {
            setIsUpdatingPhoto(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.avatarWrapper} onPress={onChangePhoto} disabled={isUpdatingPhoto}>
        {isUpdatingPhoto ? (
          <View style={styles.avatarPlaceholder}>
            <ActivityIndicator color={colors.primaryDark} />
          </View>
        ) : user?.profilePhotoUrl ? (
          <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color={colors.primaryDark} />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.photoActionRow}>
        <Button
          label={user?.profilePhotoUrl ? "Change photo" : "Add photo"}
          variant="secondary"
          small
          disabled={isUpdatingPhoto}
          onPress={onChangePhoto}
        />
        {user?.profilePhotoUrl ? (
          <Button
            label="Remove photo"
            variant="dangerOutline"
            small
            disabled={isUpdatingPhoto}
            onPress={onRemovePhoto}
          />
        ) : null}
      </View>

      <Text style={styles.title}>{user?.username}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Button label="Settings" variant="secondary" style={styles.actionButton} onPress={() => setShowSettings(true)} />
      <Button label="Log out" variant="dangerOutline" style={styles.actionButton} onPress={() => logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.background,
  },
  avatarWrapper: { marginBottom: 4 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActionRow: { flexDirection: "row", gap: 8 },
  title: { fontSize: 20, fontWeight: "600", color: colors.text, marginTop: 12 },
  email: { color: colors.textMuted },
  actionButton: { marginTop: 12, minWidth: 160 },
});
