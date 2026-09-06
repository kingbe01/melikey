import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export default function Avatar({ uri, size = 40 }: { uri: string | null; size?: number }) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimensions} />;
  }

  return (
    <View style={[styles.placeholder, dimensions]}>
      <Ionicons name="person" size={size * 0.5} color={colors.primaryDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
