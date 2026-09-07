import type { NotificationType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { sendPushNotifications } from "./push.js";

interface NotifyArgs {
  userId: string;
  type: NotificationType;
  actorId?: string;
  data?: Record<string, string>;
  pushTitle: string;
  pushBody: string;
}

// Writes the in-app Notification row and pushes to every device registered
// for that user. Never throws — a notification failure shouldn't fail the
// request (follow/likey creation) that triggered it.
export async function notify({ userId, type, actorId, data, pushTitle, pushBody }: NotifyArgs): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, actorId, data } });

    const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    if (tokens.length > 0) {
      await sendPushNotifications(tokens.map((t) => t.token), pushTitle, pushBody, { type, ...data });
    }
  } catch (err) {
    console.error("notify failed", type, userId, err);
  }
}

// Fan-out variant for "a friend posted" — one push batch instead of N
// sequential notify() calls.
export async function notifyMany(userIds: string[], type: NotificationType, actorId: string, data: Record<string, string> | undefined, pushTitle: string, pushBody: string): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, actorId, data })),
    });

    const tokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds } }, select: { token: true } });
    if (tokens.length > 0) {
      await sendPushNotifications(tokens.map((t) => t.token), pushTitle, pushBody, { type, ...data });
    }
  } catch (err) {
    console.error("notifyMany failed", type, userIds, err);
  }
}
