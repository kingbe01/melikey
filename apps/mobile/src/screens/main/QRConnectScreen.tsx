import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/Button";
import { api, ApiError } from "../../lib/api";
import { colors } from "../../theme/colors";

// A melikey user's QR code just encodes their id behind a scheme marker, so
// scanning something else (a random URL, a product barcode) doesn't get
// mistaken for a follow target.
const QR_PREFIX = "melikey:user:";

type Mode = "mine" | "scan";

export default function QRConnectScreen({ onBack }: { onBack: () => void }) {
  const { token, user } = useAuth();
  const [mode, setMode] = useState<Mode>("mine");
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const hasHandledScan = useRef(false);

  const switchToScan = () => {
    hasHandledScan.current = false;
    setScanMessage(null);
    setMode("scan");
  };

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (hasHandledScan.current || isProcessing) return;
    if (!data.startsWith(QR_PREFIX)) return;
    const followeeId = data.slice(QR_PREFIX.length);
    if (!followeeId || followeeId === user?.id) return;

    hasHandledScan.current = true;
    setIsProcessing(true);
    setScanMessage(null);
    try {
      if (!token) return;
      await api.sendFollowRequest(token, followeeId);
      setScanMessage({ text: "Follow request sent!", isError: false });
    } catch (e) {
      const message =
        e instanceof ApiError && e.message.includes("already")
          ? "You already have a connection with this person."
          : e instanceof Error
            ? e.message
            : "Couldn't send a follow request";
      setScanMessage({ text: message, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const scanAgain = () => {
    hasHandledScan.current = false;
    setScanMessage(null);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeButton, mode === "mine" && styles.modeButtonActive]}
          onPress={() => setMode("mine")}
        >
          <Text style={mode === "mine" ? styles.modeTextActive : styles.modeText}>My code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === "scan" && styles.modeButtonActive]}
          onPress={switchToScan}
        >
          <Text style={mode === "scan" ? styles.modeTextActive : styles.modeText}>Scan a code</Text>
        </TouchableOpacity>
      </View>

      {mode === "mine" ? (
        <View style={styles.mineContent}>
          <Text style={styles.subtitle}>Have a friend scan this to follow you</Text>
          <View style={styles.qrCard}>
            {user ? <QRCode value={`${QR_PREFIX}${user.id}`} size={220} /> : null}
          </View>
          <Text style={styles.username}>@{user?.username}</Text>
        </View>
      ) : (
        <View style={styles.scanContent}>
          {!permission ? (
            <ActivityIndicator color={colors.primary} />
          ) : !permission.granted ? (
            <View style={styles.permissionPrompt}>
              <Text style={styles.subtitle}>Melikey needs camera access to scan a friend's code.</Text>
              <Button label="Allow camera access" onPress={requestPermission} />
            </View>
          ) : (
            <>
              <View style={styles.cameraFrame}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={hasHandledScan.current ? undefined : onBarcodeScanned}
                />
              </View>
              <Text style={styles.subtitle}>Point your camera at a friend's code</Text>
              {isProcessing ? <ActivityIndicator color={colors.primary} style={styles.processingIndicator} /> : null}
              {scanMessage ? (
                <>
                  <Text style={scanMessage.isError ? styles.error : styles.success}>{scanMessage.text}</Text>
                  <Button label="Scan another" variant="secondary" small onPress={scanAgain} />
                </>
              ) : null}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backRow: { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  modeRow: { flexDirection: "row", marginHorizontal: 16, gap: 8, marginBottom: 16 },
  modeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeButtonActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  modeText: { color: colors.text, fontWeight: "600" },
  modeTextActive: { color: colors.primaryDark, fontWeight: "600" },
  mineContent: { flex: 1, alignItems: "center", padding: 24, gap: 16 },
  subtitle: { color: colors.textMuted, textAlign: "center" },
  qrCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  username: { fontSize: 17, fontWeight: "600", color: colors.text },
  scanContent: { flex: 1, alignItems: "center", padding: 24, gap: 16 },
  permissionPrompt: { alignItems: "center", gap: 16, marginTop: 40 },
  cameraFrame: {
    width: 260,
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.text,
  },
  camera: { flex: 1 },
  processingIndicator: { marginTop: 4 },
  error: { color: colors.danger, textAlign: "center" },
  success: { color: colors.success, textAlign: "center" },
});
