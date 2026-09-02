import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api, type AuthUser, type IncomingFollowRequest, type OutgoingFollowRequest } from "../../lib/api";

export default function PeopleScreen() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AuthUser[]>([]);
  const [incoming, setIncoming] = useState<IncomingFollowRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingFollowRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!token) return;
    try {
      const [inRes, outRes] = await Promise.all([
        api.incomingRequests(token),
        api.outgoingRequests(token),
      ]);
      setIncoming(inRes.requests);
      setOutgoing(outRes.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
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
    try {
      const res = await api.searchUsers(token, query.trim());
      setResults(res.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    }
  };

  const onSendRequest = async (followeeId: string) => {
    if (!token) return;
    setError(null);
    try {
      await api.sendFollowRequest(token, followeeId);
      setResults((prev) => prev.filter((u) => u.id !== followeeId));
      await loadRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send request");
    }
  };

  const onApprove = async (id: string) => {
    if (!token) return;
    await api.approveRequest(token, id);
    await loadRequests();
  };

  const onDeny = async (id: string) => {
    if (!token) return;
    await api.denyRequest(token, id);
    await loadRequests();
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
        <TouchableOpacity style={styles.searchButton} onPress={onSearch}>
          <Text style={styles.link}>Search</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item.username}</Text>
            <TouchableOpacity onPress={() => onSendRequest(item.id)}>
              <Text style={styles.link}>Follow</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Text style={styles.section}>Requests to approve</Text>
      <FlatList
        data={incoming}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item.follower.username}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => onApprove(item.id)}>
                <Text style={styles.link}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeny(item.id)}>
                <Text style={styles.linkDanger}>Deny</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending requests</Text>}
      />

      <Text style={styles.section}>Sent, awaiting approval</Text>
      <FlatList
        data={outgoing}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item.followee.username}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nothing pending</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  searchInput: { flex: 1 },
  searchButton: { justifyContent: "center", paddingHorizontal: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  actions: { flexDirection: "row", gap: 16 },
  link: { color: "#007aff" },
  linkDanger: { color: "#ff3b30" },
  error: { color: "#ff3b30", marginTop: 8 },
  empty: { color: "#999", paddingVertical: 8 },
});
