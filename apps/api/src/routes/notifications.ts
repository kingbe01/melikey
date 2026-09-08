import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const ACTOR_SELECT = { id: true, username: true, profilePhotoUrl: true } as const;

router.get("/", async (req, res) => {
  const all = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Self-heal: approving/denying a request deletes its notification going
  // forward (see routes/follows.ts), but this cleans up anything already
  // stale — a FOLLOW_REQUEST whose Follow was resolved elsewhere (or no
  // longer exists) has nothing left to accept/deny, so drop it here instead
  // of showing dead buttons forever.
  const followIds = all
    .filter((n) => n.type === "FOLLOW_REQUEST")
    .map((n) => (n.data as { followId?: string } | null)?.followId)
    .filter((id): id is string => !!id);
  const pendingFollowIds = new Set(
    followIds.length
      ? (
          await prisma.follow.findMany({ where: { id: { in: followIds }, status: "PENDING" }, select: { id: true } })
        ).map((f) => f.id)
      : []
  );
  const isStale = (n: (typeof all)[number]) =>
    n.type === "FOLLOW_REQUEST" && !pendingFollowIds.has((n.data as { followId?: string } | null)?.followId ?? "");

  const stale = all.filter(isStale);
  if (stale.length > 0) {
    await prisma.notification.deleteMany({ where: { id: { in: stale.map((n) => n.id) } } });
  }
  const notifications = all.filter((n) => !isStale(n));

  const actorIds = [...new Set(notifications.map((n) => n.actorId).filter((id): id is string => !!id))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: ACTOR_SELECT })
    : [];
  const actorsById = new Map(actors.map((a) => [a.id, a]));

  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data,
      readAt: n.readAt,
      createdAt: n.createdAt,
      actor: n.actorId ? (actorsById.get(n.actorId) ?? null) : null,
    })),
  });
});

router.post("/read-all", async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.status(204).send();
});

router.post("/:id/read", async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.userId) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  res.status(204).send();
});

router.delete("/:id", async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.userId) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  await prisma.notification.delete({ where: { id: notification.id } });
  res.status(204).send();
});

const registerPushTokenSchema = z.object({ token: z.string().min(1) });

router.post("/push-tokens", async (req, res) => {
  const parsed = registerPushTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  // Token is the unique key: a reinstall or account switch on the same
  // device just moves it to whoever is currently logged in.
  await prisma.pushToken.upsert({
    where: { token: parsed.data.token },
    update: { userId: req.userId! },
    create: { userId: req.userId!, token: parsed.data.token },
  });
  res.status(204).send();
});

router.delete("/push-tokens/:token", async (req, res) => {
  await prisma.pushToken.deleteMany({ where: { token: req.params.token, userId: req.userId } });
  res.status(204).send();
});

export default router;
