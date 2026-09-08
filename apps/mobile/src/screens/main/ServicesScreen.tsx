import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
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
import { api, SERVICE_SUBCATEGORIES, type LikeyWithAuthor, type ServiceSubcategory } from "../../lib/api";
import { formatLocation } from "../../lib/formatLocation";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { useImageViewer } from "../../lib/useImageViewer";
import { TIER_COLORS, TIER_LABELS } from "../../lib/likeyTiers";
import type { MainStackParamList } from "../../navigation/MainNavigator";
import { colors } from "../../theme/colors";
import CreateServiceLikeyScreen from "./CreateServiceLikeyScreen";

export default function ServicesScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [isCreating, setIsCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [subcategory, setSubcategory] = useState<ServiceSubcategory | null>(null);
  const [likeys, setLikeys] = useState<LikeyWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openImage, modal: imageViewerModal } = useImageViewer();

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.services(token, { q: query.trim() || undefined, subcategory: subcategory ?? undefined });
      setLikeys(res.likeys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load recommendations");
    } finally {
      setIsLoading(false);
    }
  }, [token, query, subcategory]);

  useEffect(() => {
    load();
  }, [load]);

  if (isCreating) {
    return (
      <CreateServiceLikeyScreen
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
            Search recommendations from people you follow for home services — landscaping, plumbing, and more.
          </Text>
          <Button label="Recommend a service" style={styles.createButton} onPress={() => setIsCreating(true)} />

          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.searchInput]}
              placeholder="Search by name or note"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={load}
            />
          </View>

          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, subcategory === null && styles.chipSelected]}
              onPress={() => setSubcategory(null)}
            >
              <Text style={subcategory === null ? styles.chipTextSelected : undefined}>All</Text>
            </TouchableOpacity>
            {SERVICE_SUBCATEGORIES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, subcategory === s && styles.chipSelected]}
                onPress={() => setSubcategory(s)}
              >
                <Text style={subcategory === s ? styles.chipTextSelected : undefined}>{s}</Text>
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
            {query || subcategory
              ? "No recommendations match those filters."
              : "No recommendations yet from people you follow — be the first."}
          </Text>
        ) : null
      }
      renderItem={({ item }) => {
        const location = formatLocation(item.business.city, item.business.state);
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
            <Text style={styles.businessName}>{item.business.name}</Text>
            <Text style={styles.muted}>
              {item.business.subcategory}
              {location ? ` · ${location}` : ""} · {formatRelativeTime(item.createdAt)}
            </Text>
            {item.business.phone || item.business.email ? (
              <View style={styles.contactRow}>
                {item.business.phone ? (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => Linking.openURL(`tel:${item.business.phone}`)}
                  >
                    <Ionicons name="call-outline" size={14} color={colors.primaryDark} />
                    <Text style={styles.contactButtonText}>{item.business.phone}</Text>
                  </TouchableOpacity>
                ) : null}
                {item.business.email ? (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => Linking.openURL(`mailto:${item.business.email}`)}
                  >
                    <Ionicons name="mail-outline" size={14} color={colors.primaryDark} />
                    <Text style={styles.contactButtonText}>{item.business.email}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
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
  linkButton: { alignSelf: "flex-start" },
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
  contactRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  contactButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  contactButtonText: { color: colors.primaryDark, fontSize: 13, fontWeight: "600" },
});
