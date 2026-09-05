import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api, type Likey, type LikeyTier } from "../../lib/api";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import { colors } from "../../theme/colors";

const TIER_LABELS: Record<LikeyTier, string> = {
  LIKED: "Likey",
  FINE: "Soso",
  DISLIKED: "No Likey",
};

const TIER_COLORS: Record<LikeyTier, string> = {
  LIKED: colors.success,
  FINE: colors.warning,
  DISLIKED: colors.danger,
};

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const [likeys, setLikeys] = useState<Likey[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMyLikeys = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await api.myLikeys(token);
      setLikeys(res.likeys);
    } catch {
      setLikeys([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadMyLikeys();
    }, [loadMyLikeys])
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={likeys}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <TouchableOpacity style={styles.button} onPress={() => logout()}>
            <Text style={styles.buttonText}>Log out</Text>
          </TouchableOpacity>
          <Text style={styles.section}>My Likeys</Text>
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <Text style={styles.muted}>You haven't posted a Likey yet.</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.businessName}>{item.business.name}</Text>
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
              <Text style={styles.tierBadgeText}>{TIER_LABELS[item.tier]}</Text>
            </View>
          </View>
          <Text style={styles.muted}>
            {item.business.category} · {formatRelativeTime(item.createdAt)}
          </Text>
          {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.photo} /> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  header: { alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "600", color: colors.text },
  email: { color: colors.textMuted },
  button: {
    marginTop: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: { color: colors.primaryDark, fontWeight: "600" },
  section: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    color: colors.text,
  },
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
});
