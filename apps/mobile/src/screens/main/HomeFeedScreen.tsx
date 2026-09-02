import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api, type FeedItem, type LikeyTier } from "../../lib/api";
import { useCurrentLocation } from "../../lib/useCurrentLocation";

const TIER_LABELS: Record<LikeyTier, string> = {
  LIKED: "Liked",
  FINE: "Fine",
  DISLIKED: "Disliked",
};

const TIER_COLORS: Record<LikeyTier, string> = {
  LIKED: "#34c759",
  FINE: "#ff9500",
  DISLIKED: "#ff3b30",
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

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
  list: { padding: 16, gap: 12, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  businessName: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  tierBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  comment: { fontSize: 14 },
  photo: { width: "100%", height: 180, borderRadius: 8 },
  muted: { color: "#999", fontSize: 13 },
  error: { color: "#ff3b30" },
});
