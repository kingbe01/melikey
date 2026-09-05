import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api, type FeedItem } from "../../lib/api";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import { useCurrentLocation } from "../../lib/useCurrentLocation";
import { colors } from "../../theme/colors";
import PlaceDetailView, { type PlaceInfo } from "./PlaceDetailView";

interface ManualLocation {
  label: string;
  lat: number;
  lng: number;
}

export default function HomeFeedScreen() {
  const { token } = useAuth();
  const { coords, error: locationError, isLoading: isLoadingLocation } = useCurrentLocation();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingPlace, setViewingPlace] = useState<PlaceInfo | null>(null);

  const [locationQuery, setLocationQuery] = useState("");
  const [manualLocation, setManualLocation] = useState<ManualLocation | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const activeCoords = manualLocation ? { lat: manualLocation.lat, lng: manualLocation.lng } : coords;

  const loadFeed = useCallback(async () => {
    if (!token || !activeCoords) return;
    setIsLoadingFeed(true);
    setError(null);
    try {
      const res = await api.feed(token, activeCoords.lat, activeCoords.lng);
      setFeed(res.feed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the feed");
    } finally {
      setIsLoadingFeed(false);
    }
  }, [token, activeCoords]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const onSearchLocation = async () => {
    if (!token || !locationQuery.trim()) return;
    setGeocodeError(null);
    setIsGeocoding(true);
    try {
      const res = await api.geocode(token, locationQuery.trim());
      setManualLocation({ label: res.label, lat: res.latitude, lng: res.longitude });
    } catch (e) {
      setGeocodeError(e instanceof Error ? e.message : "Couldn't find that location");
    } finally {
      setIsGeocoding(false);
    }
  };

  const useMyLocation = () => {
    setManualLocation(null);
    setLocationQuery("");
    setGeocodeError(null);
  };

  if (isLoadingLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text>Finding what's near you...</Text>
      </View>
    );
  }

  if (viewingPlace) {
    return <PlaceDetailView place={viewingPlace} onBack={() => setViewingPlace(null)} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={feed}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isLoadingFeed} onRefresh={loadFeed} />}
      ListHeaderComponent={
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.searchInput]}
              placeholder="Search a city, state, or zip"
              autoCorrect={false}
              value={locationQuery}
              onChangeText={setLocationQuery}
              onSubmitEditing={onSearchLocation}
            />
            <TouchableOpacity
              style={[styles.searchButton, isGeocoding && styles.searchButtonDisabled]}
              onPress={onSearchLocation}
              disabled={isGeocoding}
            >
              {isGeocoding ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
          {geocodeError ? <Text style={styles.error}>{geocodeError}</Text> : null}
          {locationError && !manualLocation ? (
            <Text style={styles.error}>{locationError} Search a location above instead.</Text>
          ) : null}
          {manualLocation ? (
            <View style={styles.manualLocationRow}>
              <Text style={styles.manualLocationText}>Showing: {manualLocation.label}</Text>
              <TouchableOpacity onPress={useMyLocation}>
                <Text style={styles.link}>Use my location</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        !isLoadingFeed ? (
          <View style={styles.centered}>
            <Text style={styles.muted}>
              {error ?? "No Likeys near you yet from people you follow."}
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            setViewingPlace({
              name: item.businessName,
              category: item.businessCategory,
              address: item.businessAddress,
              city: item.businessCity,
              state: item.businessState,
              latitude: item.latitude,
              longitude: item.longitude,
            })
          }
        >
          <View style={styles.cardHeader}>
            <Text style={styles.businessName}>{item.businessName}</Text>
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
              <Text style={styles.tierBadgeText}>{TIER_LABELS[item.tier]}</Text>
            </View>
          </View>
          <Text style={styles.muted}>
            {item.businessCategory} · {item.distanceMiles.toFixed(1)} mi · @{item.authorUsername} ·{" "}
            {formatRelativeTime(item.createdAt)}
          </Text>
          {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.photo} /> : null}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  searchSection: { gap: 8, marginBottom: 4 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  searchInput: { flex: 1 },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonDisabled: { opacity: 0.6 },
  searchButtonText: { color: colors.surface, fontWeight: "600" },
  manualLocationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  manualLocationText: { color: colors.primaryDark, fontWeight: "600", flexShrink: 1 },
  link: { color: colors.primary, fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 6,
    backgroundColor: colors.surface,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  businessName: { fontSize: 16, fontWeight: "600", flexShrink: 1, color: colors.text },
  tierBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { color: colors.surface, fontSize: 12, fontWeight: "600" },
  comment: { fontSize: 14, color: colors.text },
  photo: { width: "100%", height: 180, borderRadius: 8 },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger },
});
