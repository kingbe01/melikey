import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api, type AuthUser, type IncomingFollowRequest, type OutgoingFollowRequest } from "../../lib/api";
import { colors } from "../../theme/colors";

export default function PeopleScreen() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AuthUser[]>([]);
  const [incoming, setIncoming] = useState<IncomingFollowRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingFollowRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!token) return;
    setIsLoadingRequests(true);
    try {
      const [inRes, outRes] = await Promise.all([
        api.incomingRequests(token),
        api.outgoingRequests(token),
      ]);
      setIncoming(inRes.requests);
      setOutgoing(outRes.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setIsLoadingRequests(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
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
      await loadRequests();
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
      await loadRequests();
    } finally {
      setPendingId(null);
    }
  };

  const onDeny = async (id: string) => {
    if (!token) return;
    setPendingId(id);
    try {
      await api.denyRequest(token, id);
      await loadRequests();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.section}>Find people</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.searchInput]}
          placeholder="Search by username or email"
          autoCapitalize="none"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={onSearch}
        />
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary, isSearching && styles.actionButtonDisabled]}
          onPress={onSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.actionButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.username}</Text>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonPrimary,
                pendingId === item.id && styles.actionButtonDisabled,
              ]}
              onPress={() => onSendRequest(item.id)}
              disabled={pendingId === item.id}
            >
              {pendingId === item.id ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Follow</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />

      <Text style={styles.section}>Requests to approve</Text>
      {isLoadingRequests ? <ActivityIndicator style={styles.loadingIndicator} /> : null}
      <FlatList
        data={incoming}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.follower.username}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonPrimary,
                  pendingId === item.id && styles.actionButtonDisabled,
                ]}
                onPress={() => onApprove(item.id)}
                disabled={pendingId === item.id}
              >
                {pendingId === item.id ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>Approve</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonDanger,
                  pendingId === item.id && styles.actionButtonDisabled,
                ]}
                onPress={() => onDeny(item.id)}
                disabled={pendingId === item.id}
              >
                {pendingId === item.id ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>Deny</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoadingRequests ? <Text style={styles.empty}>No pending requests</Text> : null}
      />

      <Text style={styles.section}>Sent, awaiting approval</Text>
      <FlatList
        data={outgoing}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.followee.username}</Text>
          </View>
        )}
        ListEmptyComponent={!isLoadingRequests ? <Text style={styles.empty}>Nothing pending</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
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
  actions: { flexDirection: "row", gap: 10 },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPrimary: { backgroundColor: colors.primary },
  actionButtonDanger: { backgroundColor: colors.danger },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: colors.surface, fontWeight: "600", fontSize: 15 },
  error: { color: colors.danger, marginTop: 8 },
  empty: { color: colors.textMuted, paddingVertical: 8 },
});
