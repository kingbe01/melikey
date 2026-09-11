import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import { api, type AuthUser, type FeedItem, type Likey } from "../../lib/api";
import { formatLocation } from "../../lib/formatLocation";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { useImageViewer } from "../../lib/useImageViewer";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import { useCurrentLocation } from "../../lib/useCurrentLocation";
import type { MainStackParamList, MainTabParamList } from "../../navigation/MainNavigator";
import { colors } from "../../theme/colors";
import PlaceDetailView, { type PlaceInfo } from "./PlaceDetailView";

interface ManualLocation {
  label: string;
  lat: number;
  lng: number;
}

// The feed is a flattened, denormalized shape (no nested Business object) —
// build the Likey shape CopyLikeyScreen expects. Feed items are always
// restaurant/entertainment (General/media are excluded from the feed
// entirely), so subcategory/phone/email are never populated here.
function feedItemToLikey(item: FeedItem): Likey {
  return {
    id: item.id,
    tier: item.tier,
    comment: item.comment,
    photoUrl: item.photoUrl,
    createdAt: item.createdAt,
    business: {
      id: item.businessId,
      name: item.businessName,
      category: item.businessCategory,
      subcategory: null,
      address: item.businessAddress,
      city: item.businessCity,
      state: item.businessState,
      phone: null,
      email: null,
      latitude: item.latitude,
      longitude: item.longitude,
    },
    mediaItem: null,
  };
}

export default function HomeFeedScreen() {
  const { token, user } = useAuth();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Feed">>();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { coords, error: locationError, isLoading: isLoadingLocation } = useCurrentLocation();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingPlace, setViewingPlace] = useState<PlaceInfo | null>(null);
  const { openImage, modal: imageViewerModal } = useImageViewer();

  const [locationQuery, setLocationQuery] = useState("");
  const [manualLocation, setManualLocation] = useState<ManualLocation | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const [following, setFollowing] = useState<AuthUser[]>([]);
  const [mutedUsernames, setMutedUsernames] = useState<Set<string>>(new Set());
  const [isFriendFilterOpen, setIsFriendFilterOpen] = useState(false);

  // Leaving the tab and coming back shouldn't leave an old location search
  // sitting there from last time.
  useEffect(() => {
    const unsubscribe = tabNavigation.addListener("tabPress", () => {
      setLocationQuery("");
      setManualLocation(null);
      setGeocodeError(null);
    });
    return unsubscribe;
  }, [tabNavigation]);

  // Memoized so this only produces a new reference when the underlying
  // location actually changes — an inline object literal here would get a
  // fresh identity every render, which would change loadFeed's identity
  // every render too, re-triggering useFocusEffect in an infinite loop.
  const activeCoords = useMemo(
    () => (manualLocation ? { lat: manualLocation.lat, lng: manualLocation.lng } : coords),
    [manualLocation, coords]
  );

  const loadFeed = useCallback(async () => {
    if (!token || !activeCoords) return;
    setIsLoadingFeed(true);
    setError(null);
    try {
      const res = await api.feed(token, activeCoords.lat, activeCoords.lng, user?.defaultRadiusMiles);
      setFeed(res.feed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the feed");
    } finally {
      setIsLoadingFeed(false);
    }
  }, [token, activeCoords, user?.defaultRadiusMiles]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      api
        .following(token)
        .then((res) => setFollowing(res.following))
        .catch(() => setFollowing([]));
    }, [token])
  );

  const toggleMuted = (username: string) => {
    setMutedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const visibleFeed = useMemo(
    () => feed.filter((item) => !mutedUsernames.has(item.authorUsername)),
    [feed, mutedUsernames]
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
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={visibleFeed}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
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
            <Button label="Search" loading={isGeocoding} onPress={onSearchLocation} />
          </View>
          {geocodeError ? <Text style={styles.error}>{geocodeError}</Text> : null}
          {locationError && !manualLocation ? (
            <Text style={styles.error}>{locationError} Search a location above instead.</Text>
          ) : null}
          {manualLocation ? (
            <View style={styles.manualLocationRow}>
              <Text style={styles.manualLocationText}>Showing: {manualLocation.label}</Text>
              <Button label="Use my location" variant="secondary" small onPress={useMyLocation} />
            </View>
          ) : null}

          {following.length > 0 ? (
            <View style={styles.friendFilterSection}>
              <Button
                label={`Filter friends${mutedUsernames.size > 0 ? ` (${mutedUsernames.size} muted)` : ""}`}
                variant="secondary"
                small
                style={styles.linkButton}
                onPress={() => setIsFriendFilterOpen((v) => !v)}
              />
              {isFriendFilterOpen ? (
                <View style={styles.chipRow}>
                  {following.map((friend) => {
                    const isMuted = mutedUsernames.has(friend.username);
                    return (
                      <TouchableOpacity
                        key={friend.id}
                        style={[styles.chip, !isMuted && styles.chipSelected]}
                        onPress={() => toggleMuted(friend.username)}
                      >
                        <Text style={!isMuted ? styles.chipTextSelected : styles.chipTextMuted}>
                          @{friend.username}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        !isLoadingFeed ? (
          <View style={styles.centered}>
            <Text style={styles.muted}>
              {error ??
                (feed.length > 0
                  ? "All nearby Likeys are from muted friends."
                  : "No Likeys near you yet from people you follow.")}
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const location = formatLocation(item.businessCity, item.businessState);
        return (
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
              <View style={styles.authorRow}>
                <Avatar uri={item.authorProfilePhotoUrl} size={28} />
                <Text style={styles.authorName}>@{item.authorUsername}</Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
                <Text style={styles.tierBadgeText}>{TIER_LABELS[item.tier]}</Text>
              </View>
            </View>
            <Text style={styles.businessName}>{item.businessName}</Text>
            <Text style={styles.muted}>
              {item.businessCategory}
              {location ? ` · ${location}` : ""} · {item.distanceMiles.toFixed(1)} mi ·{" "}
              {formatRelativeTime(item.createdAt)}
            </Text>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
            <Button
              label="Copy to my Likeys"
              variant="secondary"
              small
              style={styles.copyButton}
              onPress={() => navigation.navigate("CopyLikey", { source: feedItemToLikey(item) })}
            />
            {item.photoUrl ? (
              <TouchableOpacity onPress={() => openImage(item.photoUrl!)}>
                <Image source={{ uri: item.photoUrl }} style={styles.photo} />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        );
      }}
    />
    {imageViewerModal}
    </>
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
  linkButton: { alignSelf: "flex-start" },
  friendFilterSection: { gap: 8 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipTextSelected: { color: colors.primaryDark, fontWeight: "600" },
  chipTextMuted: { color: colors.textMuted, textDecorationLine: "line-through" },
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
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  authorName: { fontSize: 13, fontWeight: "600", color: colors.text },
  businessName: { fontSize: 17, fontWeight: "600", flexShrink: 1, color: colors.text },
  tierBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { color: colors.surface, fontSize: 12, fontWeight: "600" },
  comment: { fontSize: 15, color: colors.text },
  copyButton: { alignSelf: "flex-start", marginTop: 4 },
  photo: { width: "100%", height: 180, borderRadius: 8 },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger },
});
