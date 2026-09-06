import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { compressImageToBase64 } from "./compressImage";

async function resultToBase64(result: ImagePicker.ImagePickerResult): Promise<string | null> {
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return compressImageToBase64(asset.uri, asset.width, asset.height);
}

// Prompts Take Photo vs Choose from Library, then resizes + recompresses the
// result the same way (see compressImage.ts) regardless of source.
export function pickOrCapturePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert("Add a photo", undefined, [
      {
        text: "Take Photo",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"] });
          resolve(await resultToBase64(result));
        },
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
