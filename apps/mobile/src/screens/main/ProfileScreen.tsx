import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
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
      <TouchableOpacity onPress={onChangePhoto} disabled={isUpdatingPhoto}>
        <Text style={styles.link}>{user?.profilePhotoUrl ? "Change photo" : "Add photo"}</Text>
      </TouchableOpacity>
      {user?.profilePhotoUrl ? (
        <TouchableOpacity onPress={onRemovePhoto} disabled={isUpdatingPhoto}>
          <Text style={styles.linkDanger}>Remove photo</Text>
        </TouchableOpacity>
      ) : null}

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
  title: { fontSize: 20, fontWeight: "600", color: colors.text, marginTop: 12 },
  email: { color: colors.textMuted },
  button: {
    marginTop: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: { color: colors.primaryDark, fontWeight: "600" },
  link: { color: colors.primary, fontWeight: "600" },
  linkDanger: { color: colors.danger, fontWeight: "600" },
});
