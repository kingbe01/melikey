import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

// RN's ScrollView has built-in pinch-to-zoom (maximumZoomScale) — no gesture
// library needed for a simple "tap to view full-screen, pinch to zoom" viewer.
function FullScreenImage({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="close" size={30} color="#fff" />
      </TouchableOpacity>
      <ScrollView
        style={styles.backdrop}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </ScrollView>
    </Modal>
  );
}

export function useImageViewer() {
  const [uri, setUri] = useState<string | null>(null);

  const openImage = useCallback((imageUri: string) => setUri(imageUri), []);
  const closeImage = useCallback(() => setUri(null), []);

  const modal = uri ? <FullScreenImage uri={uri} onClose={closeImage} /> : null;

  return { openImage, modal };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  closeButton: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 1,
  },
});
