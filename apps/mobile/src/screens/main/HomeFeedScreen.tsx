import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api, type FeedItem } from "../../lib/api";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import { useCurrentLocation } from "../../lib/useCurrentLocation";
import { colors } from "../../theme/colors";

export default function HomeFeedScreen() {
  const { token } = useAuth();
  const { coords, error: locationError, isLoading: isLoadingLocation } = useCurrentLocation();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    if (!token || !coords) return;
    setIsLoadingFeed(true);
    setError(null);
    try {
      const res = await api.feed(token, coords.lat, coords.lng);
      setFeed(res.feed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the feed");
    } finally {
      setIsLoadingFeed(false);
    }
  }, [token, coords]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  if (isLoadingLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text>Finding what's near you...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{locationError}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={feed}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isLoadingFeed} onRefresh={loadFeed} />}
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
        <View style={styles.card}>
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
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
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
