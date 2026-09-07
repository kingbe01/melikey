const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Expo caps a single push request at 100 messages.
const BATCH_SIZE = 100;

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Fire-and-forget: a push failure should never block the request that
// triggered the notification (e.g. sending a follow request).
export async function sendPushNotifications(tokens: string[], title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  if (tokens.length === 0) return;

  const messages: PushMessage[] = tokens.map((to) => ({ to, title, body, data }));

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        console.error("Expo push send failed", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("Expo push send threw", err);
    }
  }
}
