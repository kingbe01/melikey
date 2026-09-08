import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import Avatar from "../../components/Avatar";
import { type LikeyWithAuthor, api } from "../../lib/api";
import { formatLocation } from "../../lib/formatLocation";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { useImageViewer } from "../../lib/useImageViewer";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import { colors } from "../../theme/colors";

export default function LikeyDetailScreen({ likeyId, onBack }: { likeyId: string; onBack: () => void }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { openImage, modal: imageViewerModal } = useImageViewer();
  const [likey, setLikey] = useState<LikeyWithAuthor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    api
      .likey(token, likeyId)
      .then((res) => setLikey(res.likey))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load this post"))
      .finally(() => setIsLoading(false));
  }, [token, likeyId]);

  const business = likey?.business ?? null;
  const mediaItem = likey?.mediaItem ?? null;
  const hasCoordinates = business?.latitude !== null && business?.latitude !== undefined && business?.longitude !== null && business?.longitude !== undefined;

  const openInAppleMaps = () => {
    if (!business || !hasCoordinates) return;
    const query = encodeURIComponent(business.name);
    Linking.openURL(`https://maps.apple.com/?ll=${business.latitude},${business.longitude}&q=${query}`);
  };

  const location = business ? formatLocation(business.city, business.state) : null;

  return (
    <>
    <View style={styles.container}>
      <TouchableOpacity style={[styles.backRow, { paddingTop: insets.top + 8 }]} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator style={styles.loadingIndicator} color={colors.primary} />
      ) : error || !likey ? (
        <Text style={styles.error}>{error ?? "Couldn't load this post"}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.authorRow}>
            <Avatar uri={likey.author.profilePhotoUrl} size={40} />
            <View>
              <Text style={styles.authorName}>@{likey.author.username}</Text>
              <Text style={styles.muted}>{formatRelativeTime(likey.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.placeRow}>
            <Text style={styles.businessName}>{business ? business.name : mediaItem!.title}</Text>
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[likey.tier] }]}>
              <Text style={styles.tierBadgeText}>{TIER_LABELS[likey.tier]}</Text>
            </View>
          </View>
          {business ? (
            <Text style={styles.muted}>
              {business.category}
              {business.subcategory ? ` · ${business.subcategory}` : ""}
              {location ? ` · ${location}` : ""}
            </Text>
          ) : (
            <Text style={styles.muted}>
              {mediaItem!.type}
              {mediaItem!.creator ? ` · ${mediaItem!.creator}` : ""}
              {mediaItem!.year ? ` · ${mediaItem!.year}` : ""}
            </Text>
          )}

          {business?.phone || business?.email ? (
            <View style={styles.contactRow}>
              {business.phone ? (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => Linking.openURL(`tel:${business.phone}`)}
                >
                  <Ionicons name="call-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.contactButtonText}>{business.phone}</Text>
                </TouchableOpacity>
              ) : null}
              {business.email ? (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => Linking.openURL(`mailto:${business.email}`)}
                >
                  <Ionicons name="mail-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.contactButtonText}>{business.email}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {likey.comment ? <Text style={styles.comment}>{likey.comment}</Text> : null}
          {likey.photoUrl ? (
            <TouchableOpacity onPress={() => openImage(likey.photoUrl!)}>
              <Image source={{ uri: likey.photoUrl }} style={styles.photo} />
            </TouchableOpacity>
          ) : null}

          {hasCoordinates ? (
            <>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: business!.latitude!,
                  longitude: business!.longitude!,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker coordinate={{ latitude: business!.latitude!, longitude: business!.longitude! }} />
              </MapView>

              <TouchableOpacity style={styles.mapsButton} onPress={openInAppleMaps}>
                <Ionicons name="map-outline" size={18} color={colors.surface} />
                <Text style={styles.mapsButtonText}>Open in Apple Maps</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
    {imageViewerModal}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backRow: { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  loadingIndicator: { marginTop: 24 },
  error: { color: colors.danger, padding: 16 },
  content: { padding: 16, paddingTop: 4, gap: 8 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  authorName: { fontSize: 15, fontWeight: "600", color: colors.text },
  placeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  businessName: { fontSize: 20, fontWeight: "600", color: colors.text, flexShrink: 1 },
  tierBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { color: colors.surface, fontSize: 12, fontWeight: "600" },
  comment: { fontSize: 15, color: colors.text, marginTop: 8 },
  photo: { width: "100%", height: 220, borderRadius: 10, marginTop: 8 },
  map: { width: "100%", height: 180, borderRadius: 10, marginTop: 12 },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  mapsButtonText: { color: colors.surface, fontWeight: "600", fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 14 },
  contactRow: { flexDirection: "row", gap: 16, flexWrap: "wrap", marginTop: 4 },
  contactButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactButtonText: { color: colors.primaryDark, fontSize: 14, fontWeight: "600" },
});
