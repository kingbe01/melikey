import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import Button from "../../components/Button";
import { api, type Likey, type LikeyCategory, type LikeyTier, type MyLikeysSort } from "../../lib/api";
import { formatLocation } from "../../lib/formatLocation";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { type LikeyGroup, groupLikeysByPlace } from "../../lib/groupLikeysByPlace";
import { CATEGORY_FILTERS, SORTS, TIER_FILTERS } from "../../lib/likeyFilterOptions";
import { subjectLine, subjectName } from "../../lib/likeySubject";
import { useImageViewer } from "../../lib/useImageViewer";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import type { MainTabParamList } from "../../navigation/MainNavigator";
import { colors } from "../../theme/colors";
import EditLikeyScreen from "./EditLikeyScreen";
import PlaceDetailView, { type PlaceInfo } from "./PlaceDetailView";

export default function MyLikeysScreen() {
  const { token } = useAuth();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "MyLikeys">>();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LikeyCategory | null>(null);
  const [tier, setTier] = useState<LikeyTier | null>(null);
  const [sort, setSort] = useState<MyLikeysSort>("recent");

  const [likeys, setLikeys] = useState<Likey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewingPlace, setViewingPlace] = useState<PlaceInfo | null>(null);
  const [editingItem, setEditingItem] = useState<Likey | null>(null);
  const { openImage, modal: imageViewerModal } = useImageViewer();

  // Leaving the tab and coming back shouldn't leave an old search/filter
  // sitting there from last time.
  useEffect(() => {
    const unsubscribe = tabNavigation.addListener("tabPress", () => {
      setQuery("");
      setCategory(null);
      setTier(null);
      setSort("recent");
    });
    return unsubscribe;
  }, [tabNavigation]);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await api.myLikeys(token, {
        q: query.trim() || undefined,
        category: category ?? undefined,
        tier: tier ?? undefined,
        sort,
      });
      setLikeys(res.likeys);
    } catch {
      setLikeys([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, query, category, tier, sort]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const groups = useMemo<LikeyGroup[]>(() => groupLikeysByPlace(likeys, sort), [likeys, sort]);

  const toggleExpanded = (key: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onDelete = (item: Likey) => {
    Alert.alert("Delete this Likey?", `${subjectName(item)} — this can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!token) return;
          try {
            await api.deleteLikey(token, item.id);
            setLikeys((prev) => prev.filter((l) => l.id !== item.id));
          } catch (e) {
            Alert.alert("Couldn't delete", e instanceof Error ? e.message : "Try again.");
          }
        },
      },
    ]);
  };

  const openPlaceDetail = (business: NonNullable<Likey["business"]>) => {
    setViewingPlace({
      name: business.name,
      category: business.category,
      subcategory: business.subcategory,
      address: business.address,
      city: business.city,
      state: business.state,
      latitude: business.latitude,
      longitude: business.longitude,
    });
  };

  const renderEntry = (item: Likey) => (
    <View style={styles.entryContent}>
      <TouchableOpacity disabled={!item.business} onPress={() => item.business && openPlaceDetail(item.business)}>
        <View style={styles.cardHeader}>
          <Text style={styles.muted}>{formatRelativeTime(item.createdAt)}</Text>
          <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
            <Text style={styles.tierBadgeText}>{TIER_LABELS[item.tier]}</Text>
          </View>
        </View>
        {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
      </TouchableOpacity>
      {item.photoUrl ? (
        <TouchableOpacity onPress={() => openImage(item.photoUrl!)}>
          <Image source={{ uri: item.photoUrl }} style={styles.photo} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.actionRow}>
        <Button label="Edit" onPress={() => setEditingItem(item)} style={styles.actionButton} />
        <Button label="Delete" variant="danger" onPress={() => onDelete(item)} style={styles.actionButton} />
      </View>
    </View>
  );

  if (viewingPlace) {
    return <PlaceDetailView place={viewingPlace} onBack={() => setViewingPlace(null)} />;
  }

  if (editingItem) {
    return (
      <EditLikeyScreen
        item={editingItem}
        onCancel={() => setEditingItem(null)}
        onDone={() => {
          setEditingItem(null);
          load();
        }}
      />
    );
  }

  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={groups}
      keyExtractor={(group) => group.key}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.filters}>
          <TextInput
            style={styles.input}
            placeholder="Search your Likeys"
            value={query}
            onChangeText={setQuery}
          />
          <View style={styles.chipRow}>
            {CATEGORY_FILTERS.map((c) => (
              <TouchableOpacity
                key={c.label}
                style={[styles.chip, category === c.value && styles.chipSelected]}
                onPress={() => setCategory(c.value)}
              >
                <Text style={category === c.value && styles.chipTextSelected}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chipRow}>
            {TIER_FILTERS.map((t) => (
              <TouchableOpacity
                key={t.label}
                style={[styles.chip, tier === t.value && styles.chipSelected]}
                onPress={() => setTier(t.value)}
              >
                <Text style={tier === t.value && styles.chipTextSelected}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chipRow}>
            {SORTS.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.chip, sort === s.value && styles.chipSelected]}
                onPress={() => setSort(s.value)}
              >
                <Text style={sort === s.value && styles.chipTextSelected}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <Text style={styles.muted}>
            {query || category || tier ? "No Likeys match those filters." : "You haven't posted a Likey yet."}
          </Text>
        ) : (
          <ActivityIndicator />
        )
      }
      renderItem={({ item: group }) => {
        const name = group.business?.name ?? group.mediaItem?.title ?? "";
        const line = group.business
          ? `${group.business.category}${formatLocation(group.business.city, group.business.state) ? ` · ${formatLocation(group.business.city, group.business.state)}` : ""}`
          : subjectLine(group.items[0]);

        if (group.items.length === 1) {
          return (
            <View style={styles.card}>
              <TouchableOpacity disabled={!group.business} onPress={() => group.business && openPlaceDetail(group.business)}>
                <Text style={styles.businessName}>{name}</Text>
                <Text style={styles.muted}>{line}</Text>
              </TouchableOpacity>
              {renderEntry(group.items[0])}
            </View>
          );
        }

        const isExpanded = expandedIds.has(group.key);
        const mostRecent = group.items[0];
        return (
          <View style={styles.card}>
            <TouchableOpacity style={styles.groupHeader} onPress={() => toggleExpanded(group.key)}>
              <View style={styles.groupHeaderText}>
                <Text style={styles.businessName}>{name}</Text>
                <Text style={styles.muted}>
                  {line} · last {formatRelativeTime(mostRecent.createdAt)}
                </Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[mostRecent.tier] }]}>
                <Text style={styles.tierBadgeText}>{TIER_LABELS[mostRecent.tier]}</Text>
              </View>
              <View style={styles.expandButton}>
                <Text style={styles.expandButtonText}>{group.items.length} visits</Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.primaryDark}
                />
              </View>
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
    {imageViewerModal}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  filters: { gap: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
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
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 4,
  },
  expandButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: "600" },
  historyEntry: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 10,
    paddingTop: 10,
  },
  entryContent: { gap: 6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  businessName: { fontSize: 17, fontWeight: "600", flexShrink: 1, color: colors.text },
  tierBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { color: colors.surface, fontSize: 12, fontWeight: "600" },
  comment: { fontSize: 15, color: colors.text },
  photo: { width: "100%", height: 180, borderRadius: 8 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  actionButton: { flex: 1 },
  muted: { color: colors.textMuted, fontSize: 14 },
});
