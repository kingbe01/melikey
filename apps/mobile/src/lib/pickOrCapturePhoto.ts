import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";
import { compressImageToBase64 } from "./compressImage";

async function resultToBase64(result: ImagePicker.ImagePickerResult): Promise<string | null> {
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return compressImageToBase64(asset.uri, asset.width, asset.height);
}

// Once denied, iOS never re-shows the native permission prompt — a bare
// launchCameraAsync() call just silently no-ops. Check status explicitly so
// we can point the user at Settings instead of looking like nothing happened.
async function takePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    if (!permission.canAskAgain) {
      Alert.alert(
        "Camera access needed",
        "Melikey needs camera access to take a photo. Enable it in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    }
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"] });
  return resultToBase64(result);
}

// Prompts Take Photo vs Choose from Library, then resizes + recompresses the
// result the same way (see compressImage.ts) regardless of source.
export function pickOrCapturePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert("Add a photo", undefined, [
      {
        text: "Take Photo",
        onPress: async () => resolve(await takePhoto()),
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
          resolve(await resultToBase64(result));
        },
      },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}
