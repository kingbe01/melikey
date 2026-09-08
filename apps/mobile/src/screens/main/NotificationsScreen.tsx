import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import { api, type AppNotification } from "../../lib/api";
import type { MainStackParamList } from "../../navigation/MainNavigator";
import { useNotifications } from "../../notifications/NotificationsContext";
import { colors } from "../../theme/colors";

function messageFor(notification: AppNotification): string {
  const name = notification.actor?.username ?? "Someone";
  switch (notification.type) {
    case "FOLLOW_REQUEST":
      return `${name} wants to follow you`;
    case "FOLLOW_ACCEPTED":
      return `${name} accepted your follow request`;
    case "NEW_LIKEY":
      return `${name} posted a new Likey`;
  }
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { refresh: refreshUnreadCount, markAllRead } = useNotifications();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await api.notifications(token);
      setNotifications(res.notifications);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onPressItem = async (notification: AppNotification) => {
    if (!notification.readAt && token) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      try {
        await api.markNotificationRead(token, notification.id);
      } finally {
        refreshUnreadCount();
      }
    }

    if (notification.type === "FOLLOW_ACCEPTED" && notification.actor) {
      navigation.navigate("FriendLikeys", { id: notification.actor.id, username: notification.actor.username });
    } else if (notification.type === "NEW_LIKEY" && notification.data?.likeyId) {
      navigation.navigate("LikeyDetail", { likeyId: notification.data.likeyId });
    }
  };

  const onMarkAllRead = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
  };

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <View style={styles.container}>
      {hasUnread ? (
        <Button label="Mark all as read" variant="secondary" small style={styles.markAllButton} onPress={onMarkAllRead} />
      ) : null}
      {isLoading ? (
        <ActivityIndicator style={styles.loadingIndicator} color={colors.primary} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.row, !item.readAt && styles.rowUnread]} onPress={() => onPressItem(item)}>
              <Avatar uri={item.actor?.profilePhotoUrl ?? null} size={36} />
              <View style={styles.rowText}>
                <Text style={styles.message}>{messageFor(item)}</Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.readAt ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  markAllButton: { alignSelf: "flex-end", margin: 12, marginBottom: 0 },
  loadingIndicator: { marginTop: 24 },
  list: { padding: 16, paddingBottom: 48, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  rowText: { flex: 1, gap: 2 },
  message: { fontSize: 15, color: colors.text },
  time: { fontSize: 13, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 24 },
});
