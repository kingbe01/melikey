import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
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
import {
  api,
  SERVICE_SUBCATEGORIES,
  type BusinessCategory,
  type Likey,
  type LikeyTier,
  type MyLikeysSort,
  type ServiceSubcategory,
} from "../../lib/api";
import { formatLocation } from "../../lib/formatLocation";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { type BusinessGroup, groupLikeysByPlace } from "../../lib/groupLikeysByPlace";
import { CATEGORY_FILTERS, SORTS, TIER_FILTERS } from "../../lib/likeyFilterOptions";
import { pickOrCapturePhoto } from "../../lib/pickOrCapturePhoto";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import { colors } from "../../theme/colors";
import PlaceDetailView, { type PlaceInfo } from "./PlaceDetailView";

const COMMENT_MAX = 200;

const PLACE_CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "entertainment", label: "Entertainment" },
  { value: "general", label: "General" },
];

export default function MyLikeysScreen() {
  const { token } = useAuth();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BusinessCategory | null>(null);
  const [tier, setTier] = useState<LikeyTier | null>(null);
  const [sort, setSort] = useState<MyLikeysSort>("recent");

  const [likeys, setLikeys] = useState<Likey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewingPlace, setViewingPlace] = useState<PlaceInfo | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTier, setDraftTier] = useState<LikeyTier | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [draftPhotoUrl, setDraftPhotoUrl] = useState<string | null>(null);
  const [draftPhotoBase64, setDraftPhotoBase64] = useState<string | null | undefined>(undefined);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // A manually-entered place (no externalPlaceId) isn't shared with anyone
  // else's posts, so its name/city/state are safe to correct here too — an
  // Apple-Maps-sourced place could belong to many other people's Likeys, so
  // only its category (a coarse, often-wrong guess) is editable there.
  const [canEditFullPlace, setCanEditFullPlace] = useState(false);
  const [draftBusinessId, setDraftBusinessId] = useState<string | null>(null);
  const [draftBusinessName, setDraftBusinessName] = useState("");
  const [draftBusinessCategory, setDraftBusinessCategory] = useState<BusinessCategory | null>(null);
  const [draftBusinessSubcategory, setDraftBusinessSubcategory] = useState<ServiceSubcategory | null>(null);
  const [draftBusinessCity, setDraftBusinessCity] = useState("");
  const [draftBusinessState, setDraftBusinessState] = useState("");

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

  const groups = useMemo<BusinessGroup[]>(() => groupLikeysByPlace(likeys, sort), [likeys, sort]);

  const toggleExpanded = (businessId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  };

  const startEdit = (item: Likey) => {
    setEditingId(item.id);
    setDraftTier(item.tier);
    setDraftComment(item.comment ?? "");
    setDraftPhotoUrl(item.photoUrl);
    setDraftPhotoBase64(undefined);
    setCanEditFullPlace(!item.business.externalPlaceId);
    setDraftBusinessId(item.business.id);
    setDraftBusinessName(item.business.name);
    setDraftBusinessCategory(item.business.category);
    setDraftBusinessSubcategory(item.business.subcategory);
    setDraftBusinessCity(item.business.city ?? "");
    setDraftBusinessState(item.business.state ?? "");
  };

  const cancelEdit = () => setEditingId(null);

  const pickEditPhoto = async () => {
    const base64 = await pickOrCapturePhoto();
    if (base64) {
      setDraftPhotoBase64(base64);
      setDraftPhotoUrl(`data:image/jpeg;base64,${base64}`);
    }
  };

  const removeEditPhoto = () => {
    setDraftPhotoBase64(null);
    setDraftPhotoUrl(null);
  };

  const saveEdit = async () => {
    if (!token || !editingId || !draftTier) return;
    if (canEditFullPlace && !draftBusinessName.trim()) return;
    if (!draftBusinessCategory) return;
    setIsSavingEdit(true);
    try {
      if (draftBusinessId) {
        await api.updateBusiness(token, draftBusinessId, {
          category: draftBusinessCategory,
          subcategory: draftBusinessCategory === "general" ? (draftBusinessSubcategory ?? undefined) : undefined,
          ...(canEditFullPlace
            ? {
                name: draftBusinessName.trim(),
                city: draftBusinessCity.trim() || undefined,
                state: draftBusinessState.trim() || undefined,
              }
            : {}),
        });
      }
      await api.updateLikey(token, editingId, {
        tier: draftTier,
        comment: draftComment.trim() || null,
        ...(draftPhotoBase64 !== undefined ? { photoBase64: draftPhotoBase64 } : {}),
      });
      setEditingId(null);
      load();
    } catch (e) {
      Alert.alert("Couldn't save changes", e instanceof Error ? e.message : "Try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onDelete = (item: Likey) => {
    Alert.alert("Delete this Likey?", `${item.business.name} — this can't be undone.`, [
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

  const openPlaceDetail = (business: Likey["business"]) => {
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

  const renderEntry = (item: Likey) =>
    editingId === item.id ? (
      <View style={styles.entryContent}>
        {canEditFullPlace ? (
          <>
            <Text style={styles.fieldLabel}>Place name</Text>
            <TextInput style={styles.input} value={draftBusinessName} onChangeText={setDraftBusinessName} />
          </>
        ) : (
          <Text style={styles.fieldLabel}>{draftBusinessName} — category can be corrected, other details are shared</Text>
        )}
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.chipRow}>
          {(canEditFullPlace ? PLACE_CATEGORIES : PLACE_CATEGORIES.filter((c) => c.value !== "general")).map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, draftBusinessCategory === c.value && styles.chipSelected]}
              onPress={() => setDraftBusinessCategory(c.value)}
            >
              <Text style={draftBusinessCategory === c.value && styles.chipTextSelected}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {canEditFullPlace && draftBusinessCategory === "general" ? (
          <View style={styles.chipRow}>
            {SERVICE_SUBCATEGORIES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, draftBusinessSubcategory === s && styles.chipSelected]}
                onPress={() => setDraftBusinessSubcategory(s)}
              >
                <Text style={draftBusinessSubcategory === s && styles.chipTextSelected}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {canEditFullPlace ? (
          <View style={styles.optionRow}>
            <TextInput
              style={[styles.input, styles.cityInput]}
              placeholder="City"
              value={draftBusinessCity}
              onChangeText={setDraftBusinessCity}
            />
            <TextInput
              style={[styles.input, styles.stateInput]}
              placeholder="State"
              autoCapitalize="characters"
              maxLength={2}
              value={draftBusinessState}
              onChangeText={setDraftBusinessState}
            />
          </View>
        ) : null}
        <Text style={styles.fieldLabel}>Your rating</Text>
        <View style={styles.chipRow}>
          {(["LIKED", "FINE", "DISLIKED"] as LikeyTier[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, draftTier === t && styles.chipSelected]}
              onPress={() => setDraftTier(t)}
            >
              <Text style={draftTier === t && styles.chipTextSelected}>{TIER_LABELS[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.commentInput]}
          placeholder="What stood out?"
          multiline
          maxLength={COMMENT_MAX}
          value={draftComment}
          onChangeText={setDraftComment}
        />
        {draftPhotoUrl ? (
          <View>
            <Image source={{ uri: draftPhotoUrl }} style={styles.photoPreview} />
            <Button label="Remove photo" variant="dangerOutline" small style={styles.linkButton} onPress={removeEditPhoto} />
          </View>
        ) : (
          <Button label="Add a photo" variant="secondary" small style={styles.linkButton} onPress={pickEditPhoto} />
        )}
        <View style={styles.actionRow}>
          <Button
            label="Cancel"
            variant="secondary"
            disabled={isSavingEdit}
            onPress={cancelEdit}
            style={styles.actionButton}
          />
          <Button
            label={isSavingEdit ? "Saving..." : "Save"}
            loading={isSavingEdit}
            disabled={!draftBusinessCategory || (canEditFullPlace && !draftBusinessName.trim())}
            onPress={saveEdit}
            style={styles.actionButton}
          />
        </View>
      </View>
    ) : (
      <View style={styles.entryContent}>
        <TouchableOpacity onPress={() => openPlaceDetail(item.business)}>
          <View style={styles.cardHeader}>
            <Text style={styles.muted}>{formatRelativeTime(item.createdAt)}</Text>
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
              <Text style={styles.tierBadgeText}>{TIER_LABELS[item.tier]}</Text>
            </View>
          </View>
          {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.photo} /> : null}
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <Button label="Edit" onPress={() => startEdit(item)} style={styles.actionButton} />
          <Button label="Delete" variant="danger" onPress={() => onDelete(item)} style={styles.actionButton} />
        </View>
      </View>
    );

  if (viewingPlace) {
    return <PlaceDetailView place={viewingPlace} onBack={() => setViewingPlace(null)} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={groups}
      keyExtractor={(group) => group.business.id}
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
        const location = formatLocation(group.business.city, group.business.state);

        if (group.items.length === 1) {
          return (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => openPlaceDetail(group.business)}>
                <Text style={styles.businessName}>{group.business.name}</Text>
                <Text style={styles.muted}>
                  {group.business.category}
                  {location ? ` · ${location}` : ""}
                </Text>
              </TouchableOpacity>
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
                  {location ? ` · ${location}` : ""} · last {formatRelativeTime(mostRecent.createdAt)}
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
  commentInput: { minHeight: 60, textAlignVertical: "top" },
  fieldLabel: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  optionRow: { flexDirection: "row", gap: 8 },
  cityInput: { flex: 2 },
  stateInput: { flex: 1 },
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
  photoPreview: { width: 120, height: 120, borderRadius: 10, marginBottom: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  actionButton: { flex: 1 },
  linkButton: { alignSelf: "flex-start" },
  muted: { color: colors.textMuted, fontSize: 14 },
});
