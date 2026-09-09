import { navigationRef } from "../navigation/navigationRef";

// Tapping a push notification should land wherever the same notification
// would take you in-app — see NotificationsScreen's onPressItem — falling
// back to the Notifications list itself (e.g. for a follow request, which
// resolves via Accept/Deny there rather than a dedicated screen).
export function navigateForNotificationData(data: unknown): void {
  if (!navigationRef.isReady()) return;

  const parsed = data as { type?: string; likeyId?: string } | null | undefined;
  if (parsed?.type === "NEW_LIKEY" && parsed.likeyId) {
    navigationRef.navigate("LikeyDetail", { likeyId: parsed.likeyId });
    return;
  }

  navigationRef.navigate("Notifications");
}
