import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import { usePhotoPicker } from "../../lib/usePhotoPicker";
import type { MainStackParamList } from "../../navigation/MainNavigator";
import { colors } from "../../theme/colors";

export default function ProfileScreen() {
  const { user, updateProfilePhoto } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const { pickPhoto: openPhotoPicker, modal: photoPickerModal } = usePhotoPicker();

  const onChangePhoto = async () => {
    const base64 = await openPhotoPicker();
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
    <>
    <View style={styles.container}>
      <TouchableOpacity style={styles.avatarWrapper} onPress={onChangePhoto} disabled={isUpdatingPhoto}>
        {isUpdatingPhoto ? (
          <View style={[styles.avatarLoading, { width: 96, height: 96, borderRadius: 48 }]}>
            <ActivityIndicator color={colors.primaryDark} />
          </View>
        ) : (
          <Avatar uri={user?.profilePhotoUrl ?? null} size={96} />
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

      <View style={styles.usernameRow}>
        <Text style={styles.title}>{user?.username}</Text>
        <TouchableOpacity
          style={styles.editUsernameButton}
          onPress={() => navigation.navigate("Settings")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="pencil" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.email}>{user?.email}</Text>
    </View>
    {photoPickerModal}
    </>
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
  avatarLoading: {
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActionRow: { flexDirection: "row", gap: 8 },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  editUsernameButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "600", color: colors.text },
  email: { color: colors.textMuted },
});
