import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Sent on every API request so server logs show which build/device a request
// came from (e.g. an App Review iPad) — no user data, just the client.
export const CLIENT_INFO_HEADERS: Record<string, string> = {
  "X-App-Version": Constants.expoConfig?.version ?? "unknown",
  "X-App-Build":
    (Platform.OS === "ios" ? Constants.expoConfig?.ios?.buildNumber : String(Constants.expoConfig?.android?.versionCode ?? "")) ||
    "unknown",
  "X-Device": Device.modelName ?? "unknown",
  "X-OS": `${Device.osName ?? Platform.OS} ${Device.osVersion ?? ""}`.trim(),
};
