import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api, type BusinessCategory, type Likey, type LikeyTier, type MyLikeysSort } from "../../lib/api";
import { compressImageToBase64 } from "../../lib/compressImage";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { type BusinessGroup, groupLikeysByPlace } from "../../lib/groupLikeysByPlace";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import { colors } from "../../theme/colors";

const CATEGORY_FILTERS: { value: BusinessCategory | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "restaurant", label: "Restaurant" },
  { value: "entertainment", label: "Entertainment" },
];

const TIER_FILTERS: { value: LikeyTier | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "LIKED", label: "Likey" },
  { value: "FINE", label: "Soso" },
  { value: "DISLIKED", label: "No Likey" },
];

const SORTS: { value: MyLikeysSort; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "oldest", label: "Oldest" },
  { value: "tier", label: "Tier" },
  { value: "business", label: "Place name" },
];

const COMMENT_MAX = 200;

export default function MyLikeysScreen() {
  const { token } = useAuth();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BusinessCategory | null>(null);
  const [tier, setTier] = useState<LikeyTier | null>(null);
  const [sort, setSort] = useState<MyLikeysSort>("recent");

  const [likeys, setLikeys] = useState<Likey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTier, setDraftTier] = useState<LikeyTier | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [draftPhotoUrl, setDraftPhotoUrl] = useState<string | null>(null);
  const [draftPhotoBase64, setDraftPhotoBase64] = useState<string | null | undefined>(undefined);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
  };

  const cancelEdit = () => setEditingId(null);

  const pickEditPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) {
      const base64 = await compressImageToBase64(asset.uri, asset.width, asset.height);
      if (base64) {
        setDraftPhotoBase64(base64);
        setDraftPhotoUrl(`data:image/jpeg;base64,${base64}`);
      }
    }
  };

  const removeEditPhoto = () => {
    setDraftPhotoBase64(null);
    setDraftPhotoUrl(null);
  };

  const saveEdit = async () => {
    if (!token || !editingId || !draftTier) return;
    setIsSavingEdit(true);
    try {
      const { likey } = await api.updateLikey(token, editingId, {
        tier: draftTier,
        comment: draftComment.trim() || null,
        ...(draftPhotoBase64 !== undefined ? { photoBase64: draftPhotoBase64 } : {}),
      });
      setLikeys((prev) => prev.map((l) => (l.id === likey.id ? likey : l)));
      setEditingId(null);
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

  const renderEntry = (item: Likey) =>
    editingId === item.id ? (
      <View style={styles.entryContent}>
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
            <TouchableOpacity onPress={removeEditPhoto}>
              <Text style={styles.linkDanger}>Remove photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={pickEditPhoto}>
            <Text style={styles.link}>Add a photo</Text>
          </TouchableOpacity>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonNeutral, isSavingEdit && styles.actionButtonDisabled]}
            onPress={cancelEdit}
            disabled={isSavingEdit}
          >
            <Text style={styles.actionButtonTextNeutral}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary, isSavingEdit && styles.actionButtonDisabled]}
            onPress={saveEdit}
            disabled={isSavingEdit}
          >
            <Text style={styles.actionButtonText}>{isSavingEdit ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View style={styles.entryContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.muted}>{formatRelativeTime(item.createdAt)}</Text>
          <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
            <Text style={styles.tierBadgeText}>{TIER_LABELS[item.tier]}</Text>
          </View>
        </View>
        {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
        {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.photo} /> : null}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => startEdit(item)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => onDelete(item)}>
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={groups}
      keyExtractor={(group) => group.business.id}
      keyboardShouldPersistTaps="handled"
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
        if (group.items.length === 1) {
          return (
            <View style={styles.card}>
              <Text style={styles.businessName}>{group.business.name}</Text>
              <Text style={styles.muted}>{group.business.category}</Text>
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
                  {group.business.category} · {group.items.length} visits · last{" "}
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
  photoPreview: { width: 120, height: 120, borderRadius: 10, marginBottom: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPrimary: { backgroundColor: colors.primary },
  actionButtonDanger: { backgroundColor: colors.danger },
  actionButtonNeutral: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: colors.surface, fontWeight: "600", fontSize: 15 },
  actionButtonTextNeutral: { color: colors.text, fontWeight: "600", fontSize: 15 },
  link: { color: colors.primary, fontWeight: "600" },
  linkDanger: { color: colors.danger, fontWeight: "600" },
  muted: { color: colors.textMuted, fontSize: 13 },
});
