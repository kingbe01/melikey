import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
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
import { api, MEDIA_TYPES, type LikeyWithAuthor, type MediaType } from "../../lib/api";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { useImageViewer } from "../../lib/useImageViewer";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import type { MainStackParamList, MainTabParamList } from "../../navigation/MainNavigator";
import { colors } from "../../theme/colors";
import CreateMediaLikeyScreen from "./CreateMediaLikeyScreen";

export default function OtherScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Other">>();

  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MediaType | null>(null);
  const [likeys, setLikeys] = useState<LikeyWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openImage, modal: imageViewerModal } = useImageViewer();

  // Leaving the tab and coming back shouldn't leave a half-typed search or
  // an in-progress recommendation form sitting there.
  useEffect(() => {
    const unsubscribe = tabNavigation.addListener("tabPress", () => {
      setIsCreating(false);
      setQuery("");
      setType(null);
    });
    return unsubscribe;
  }, [tabNavigation]);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.media(token, { q: query.trim() || undefined, type: type ?? undefined });
      setLikeys(res.likeys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load recommendations");
    } finally {
      setIsLoading(false);
    }
  }, [token, query, type]);

  useEffect(() => {
    load();
  }, [load]);

  if (isCreating) {
    return (
      <CreateMediaLikeyScreen
        onDone={() => {
          setIsCreating(false);
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
      data={likeys}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Search recommendations from people you follow for books, movies, and TV shows.
          </Text>
          <Button label="Recommend something" style={styles.createButton} onPress={() => setIsCreating(true)} />

          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.searchInput]}
              placeholder="Search by title or note"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={load}
            />
          </View>

          <View style={styles.chipRow}>
            <TouchableOpacity style={[styles.chip, type === null && styles.chipSelected]} onPress={() => setType(null)}>
              <Text style={type === null ? styles.chipTextSelected : undefined}>All</Text>
            </TouchableOpacity>
            {MEDIA_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipSelected]} onPress={() => setType(t)}>
                <Text style={type === t ? styles.chipTextSelected : undefined}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? <ActivityIndicator style={styles.loadingIndicator} color={colors.primary} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <Text style={styles.empty}>
            {query || type
              ? "No recommendations match those filters."
              : "No recommendations yet from people you follow — be the first."}
          </Text>
        ) : null
      }
      renderItem={({ item }) => {
        const mediaItem = item.mediaItem!;
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.getParent<NativeStackNavigationProp<MainStackParamList>>()?.navigate("LikeyDetail", { likeyId: item.id })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.authorRow}>
                <Avatar uri={item.author.profilePhotoUrl} size={28} />
                <Text style={styles.authorName}>@{item.author.username}</Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
                <Text style={styles.tierBadgeText}>{TIER_LABELS[item.tier]}</Text>
              </View>
            </View>
            <Text style={styles.businessName}>{mediaItem.title}</Text>
            <Text style={styles.muted}>
              {mediaItem.type}
              {mediaItem.creator ? ` · ${mediaItem.creator}` : ""}
              {mediaItem.year ? ` · ${mediaItem.year}` : ""} · {formatRelativeTime(item.createdAt)}
            </Text>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
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
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  header: { gap: 8, marginBottom: 4 },
  subtitle: { color: colors.textMuted },
  createButton: { marginTop: 4 },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  searchInput: { flex: 1 },
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
  loadingIndicator: { marginTop: 4 },
  error: { color: colors.danger },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 24, paddingHorizontal: 16 },
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
  businessName: { fontSize: 17, fontWeight: "600", color: colors.text },
  tierBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { color: colors.surface, fontSize: 12, fontWeight: "600" },
  comment: { fontSize: 15, color: colors.text },
  photo: { width: "100%", height: 180, borderRadius: 8 },
  muted: { color: colors.textMuted, fontSize: 14 },
});
