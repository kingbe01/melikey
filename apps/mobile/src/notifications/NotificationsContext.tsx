import * as Notifications from "expo-notifications";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { registerForPushNotificationsAsync } from "../lib/push";

interface NotificationsContextValue {
  unreadCount: number;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const registeredPushForToken = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const { notifications } = await api.notifications(token);
      setUnreadCount(notifications.filter((n) => !n.readAt).length);
    } catch {
      // Notifications are non-critical — a failed refresh just leaves the
      // last known count on screen.
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    refresh();
  }, [token, refresh]);

  useEffect(() => {
    if (!token || registeredPushForToken.current === token) return;
    registeredPushForToken.current = token;
    (async () => {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        try {
          await api.registerPushToken(token, pushToken);
        } catch {
          // Best-effort — the app still works without push registered.
        }
      }
    })();
  }, [token]);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(() => refresh());
    const responseSub = Notifications.addNotificationResponseReceivedListener(() => refresh());
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [refresh]);

  const markAllRead = async () => {
    if (!token) return;
    setUnreadCount(0);
    try {
      await api.markAllNotificationsRead(token);
    } catch {
      refresh();
    }
  };

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return ctx;
}
