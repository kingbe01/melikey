import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import { colors } from "../theme/colors";
import { compressImageToBase64 } from "./compressImage";

// Once denied, iOS never re-shows the native permission prompt — a bare
// launchCameraAsync() call just silently no-ops. Check status explicitly so
// we can point the user at Settings instead of looking like nothing happened.
async function requestCameraAccess(): Promise<boolean> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.granted) return true;
  if (!permission.canAskAgain) {
    Alert.alert("Camera access needed", "Melikey needs camera access to take a photo. Enable it in Settings.", [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: () => Linking.openSettings() },
    ]);
  }
  return false;
}

// Crop and picking a photo produces a starting point; rotate is handled here
// afterward since iOS's native editor (allowsEditing) only offers crop, not
// rotate (Android's does both, but we can't rely on platform differences).
function RotateReviewModal({
  uri,
  onCancel,
  onConfirm,
}: {
  uri: string;
  onCancel: () => void;
  onConfirm: (base64: string | null) => void;
}) {
  const [currentUri, setCurrentUri] = useState(uri);
  const [isProcessing, setIsProcessing] = useState(false);

  const rotate = async () => {
    setIsProcessing(true);
    try {
      const context = ImageManipulator.manipulate(currentUri);
      context.rotate(90);
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG });
      setCurrentUri(saved.uri);
    } catch {
      Alert.alert("Couldn't rotate", "Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirm = async () => {
    setIsProcessing(true);
    try {
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(currentUri, (w, h) => resolve({ width: w, height: h }), reject);
      });
      onConfirm(await compressImageToBase64(currentUri, width, height));
    } catch {
      Alert.alert("Couldn't use this photo", "Try again.");
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        <Text style={styles.title}>Edit photo</Text>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: currentUri }} style={styles.image} resizeMode="contain" />
          {isProcessing ? (
            <View style={styles.overlay}>
              <ActivityIndicator color={colors.surface} size="large" />
            </View>
          ) : null}
        </View>
        <Button label="Rotate" variant="secondary" onPress={rotate} disabled={isProcessing} style={styles.rotateButton} />
        <View style={styles.footer}>
          <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={isProcessing} style={styles.footerButton} />
          <Button label="Use Photo" onPress={confirm} disabled={isProcessing} style={styles.footerButton} />
        </View>
      </View>
    </Modal>
  );
}

// Crop (native OS editor, drag-to-adjust) + rotate (this modal, since iOS's
// native editor only offers crop) before handing back a compressed base64
// JPEG ready to attach — same output shape the old pickOrCapturePhoto had.
export function usePhotoPicker() {
  const [editingUri, setEditingUri] = useState<string | null>(null);
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  const finish = useCallback((value: string | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setEditingUri(null);
  }, []);

  const pickPhoto = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      Alert.alert("Add a photo", undefined, [
        {
          text: "Take Photo",
          onPress: async () => {
            if (!(await requestCameraAccess())) {
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true });
            if (result.canceled) {
              resolve(null);
              return;
            }
            resolverRef.current = resolve;
            setEditingUri(result.assets[0].uri);
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true });
            if (result.canceled) {
              resolve(null);
              return;
            }
            resolverRef.current = resolve;
            setEditingUri(result.assets[0].uri);
          },
        },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
    });
  }, []);

  const modal = editingUri ? (
    <RotateReviewModal uri={editingUri} onCancel={() => finish(null)} onConfirm={finish} />
  ) : null;

  return { pickPhoto, modal };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16, paddingTop: 60 },
  title: { fontSize: 18, fontWeight: "600", color: colors.text, textAlign: "center", marginBottom: 16 },
  imageWrapper: { flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  image: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  rotateButton: { marginTop: 16, alignSelf: "center" },
  footer: { flexDirection: "row", gap: 10, marginTop: 16 },
  footerButton: { flex: 1 },
});
