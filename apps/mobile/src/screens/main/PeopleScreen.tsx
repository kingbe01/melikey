import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import { api, type AuthUser, type IncomingFollowRequest, type OutgoingFollowRequest } from "../../lib/api";
import { colors } from "../../theme/colors";
import FriendLikeysView from "./FriendLikeysView";

export default function PeopleScreen() {
  const { token } = useAuth();
  const [viewingFriend, setViewingFriend] = useState<AuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AuthUser[]>([]);
  const [incoming, setIncoming] = useState<IncomingFollowRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingFollowRequest[]>([]);
  const [following, setFollowing] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!token) return;
    setIsLoadingConnections(true);
    try {
      const [inRes, outRes, followingRes] = await Promise.all([
        api.incomingRequests(token),
        api.outgoingRequests(token),
        api.following(token),
      ]);
      setIncoming(inRes.requests);
      setOutgoing(outRes.requests);
      setFollowing(followingRes.following);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setIsLoadingConnections(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadConnections();
    }, [loadConnections])
  );

  const onSearch = async () => {
    if (!token || !query.trim()) return;
    setError(null);
    setIsSearching(true);
    try {
      const res = await api.searchUsers(token, query.trim());
      setResults(res.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const onSendRequest = async (followeeId: string) => {
    if (!token) return;
    setError(null);
    setPendingId(followeeId);
    try {
      await api.sendFollowRequest(token, followeeId);
      setResults((prev) => prev.filter((u) => u.id !== followeeId));
      await loadConnections();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send request");
    } finally {
      setPendingId(null);
    }
  };

  const onApprove = async (id: string) => {
    if (!token) return;
    setPendingId(id);
    try {
      await api.approveRequest(token, id);
      await loadConnections();
    } finally {
      setPendingId(null);
    }
  };

  const onDeny = async (id: string) => {
    if (!token) return;
    setPendingId(id);
    try {
      await api.denyRequest(token, id);
      await loadConnections();
    } finally {
      setPendingId(null);
    }
  };

  if (viewingFriend) {
    return <FriendLikeysView user={viewingFriend} onBack={() => setViewingFriend(null)} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.section}>Find people</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.searchInput]}
          placeholder="Search by username or email"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={onSearch}
        />
        <Button label="Search" loading={isSearching} onPress={onSearch} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={results}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.username}</Text>
            <Button
              label="Follow"
              small
              loading={pendingId === item.id}
              onPress={() => onSendRequest(item.id)}
            />
          </View>
        )}
      />

      <Text style={styles.section}>Requests to approve</Text>
      {isLoadingConnections ? <ActivityIndicator style={styles.loadingIndicator} /> : null}
      <FlatList
        data={incoming}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.follower.username}</Text>
            <View style={styles.actions}>
              <Button label="Approve" small loading={pendingId === item.id} onPress={() => onApprove(item.id)} />
              <Button
                label="Deny"
                variant="danger"
                small
                loading={pendingId === item.id}
                onPress={() => onDeny(item.id)}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoadingConnections ? <Text style={styles.empty}>No pending requests</Text> : null}
      />

      <Text style={styles.section}>Sent, awaiting approval</Text>
      <FlatList
        data={outgoing}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.followee.username}</Text>
          </View>
        )}
        ListEmptyComponent={!isLoadingConnections ? <Text style={styles.empty}>Nothing pending</Text> : null}
      />

      <Text style={styles.section}>Following</Text>
      <FlatList
        data={following}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setViewingFriend(item)}>
            <View style={styles.friendRowLeft}>
              <Avatar uri={item.profilePhotoUrl} size={36} />
              <Text style={styles.rowText}>{item.username}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoadingConnections ? <Text style={styles.empty}>Not following anyone yet</Text> : null}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16, marginBottom: 8, color: colors.text },
  loadingIndicator: { marginBottom: 8 },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { fontSize: 15, color: colors.text, flexShrink: 1 },
  friendRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  actions: { flexDirection: "row", gap: 10 },
  error: { color: colors.danger, marginTop: 8 },
  empty: { color: colors.textMuted, paddingVertical: 8 },
});
