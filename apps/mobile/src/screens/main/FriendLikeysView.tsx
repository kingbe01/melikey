import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api, type AuthUser, type Business, type Likey } from "../../lib/api";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { type BusinessGroup, groupLikeysByPlace } from "../../lib/groupLikeysByPlace";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import { colors } from "../../theme/colors";

function formatLocation(business: Business): string | null {
  if (business.city && business.state) return `${business.city}, ${business.state}`;
  return business.city || business.state || null;
}

export default function FriendLikeysView({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const { token } = useAuth();
  const [likeys, setLikeys] = useState<Likey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.userLikeys(token, user.id);
      setLikeys(res.likeys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load their Likeys");
    } finally {
      setIsLoading(false);
    }
  }, [token, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const likey of likeys) {
      const location = formatLocation(likey.business);
      if (location) set.add(location);
    }
    return Array.from(set).sort();
  }, [likeys]);

  const filteredLikeys = useMemo(
    () => (selectedLocation ? likeys.filter((l) => formatLocation(l.business) === selectedLocation) : likeys),
    [likeys, selectedLocation]
  );

  const groups = useMemo<BusinessGroup[]>(() => groupLikeysByPlace(filteredLikeys, "recent"), [filteredLikeys]);

  const toggleExpanded = (businessId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  };

  const renderEntry = (item: Likey) => (
    <View style={styles.entryContent}>
      <View style={styles.cardHeader}>
        <Text style={styles.muted}>{formatRelativeTime(item.createdAt)}</Text>
        <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
          <Text style={styles.tierBadgeText}>{TIER_LABELS[item.tier]}</Text>
        </View>
      </View>
      {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
      {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.photo} /> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>People</Text>
      </TouchableOpacity>
      <Text style={styles.title}>@{user.username}'s Likeys</Text>

      {locationOptions.length > 0 ? (
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, selectedLocation === null && styles.chipSelected]}
            onPress={() => setSelectedLocation(null)}
          >
            <Text style={selectedLocation === null ? styles.chipTextSelected : undefined}>All</Text>
          </TouchableOpacity>
          {locationOptions.map((location) => (
            <TouchableOpacity
              key={location}
              style={[styles.chip, selectedLocation === location && styles.chipSelected]}
              onPress={() => setSelectedLocation(location)}
            >
              <Text style={selectedLocation === location ? styles.chipTextSelected : undefined}>{location}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {isLoading ? <ActivityIndicator style={styles.loadingIndicator} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={groups}
        keyExtractor={(group) => group.business.id}
        ListEmptyComponent={
          !isLoading && !error ? <Text style={styles.empty}>No Likeys posted yet</Text> : null
        }
        renderItem={({ item: group }) => {
          const location = formatLocation(group.business);

          if (group.items.length === 1) {
            return (
              <View style={styles.card}>
                <Text style={styles.businessName}>{group.business.name}</Text>
                <Text style={styles.muted}>
                  {group.business.category}
                  {location ? ` · ${location}` : ""}
                </Text>
                {renderEntry(group.items[0])}
              </View>
            );
          }

          const isExpanded = expandedIds.has(group.business.id);
          const mostRecent = group.items[0];
          return (
            <View style={styles.card}>
              <TouchableOpacity style={styles.groupHeader} onPress={() => toggleExpanded(group.business.id)}>
                <View style={styles.groupHeaderText}>
                  <Text style={styles.businessName}>{group.business.name}</Text>
                  <Text style={styles.muted}>
                    {group.business.category}
                    {location ? ` · ${location}` : ""} · {group.items.length} visits · last{" "}
                    {formatRelativeTime(mostRecent.createdAt)}
                  </Text>
                </View>
                <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[mostRecent.tier] }]}>
                  <Text style={styles.tierBadgeText}>{TIER_LABELS[mostRecent.tier]}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                  style={styles.chevron}
                />
              </TouchableOpacity>
              {isExpanded
                ? group.items.map((item) => (
                    <View key={item.id} style={styles.historyEntry}>
                      {renderEntry(item)}
                    </View>
                  ))
                : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backText: { color: colors.primary, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 8 },
  loadingIndicator: { marginBottom: 8 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 },
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
  list: { paddingBottom: 32 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 6,
    backgroundColor: colors.surface,
  },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupHeaderText: { flex: 1, gap: 2 },
  chevron: { marginLeft: 4 },
  historyEntry: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 10,
    paddingTop: 10,
  },
  entryContent: { gap: 6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  businessName: { fontSize: 16, fontWeight: "600", flexShrink: 1, color: colors.text },
  tierBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { color: colors.surface, fontSize: 12, fontWeight: "600" },
  comment: { fontSize: 14, color: colors.text },
  photo: { width: "100%", height: 180, borderRadius: 8 },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, marginBottom: 8 },
  empty: { color: colors.textMuted, paddingVertical: 8 },
});
