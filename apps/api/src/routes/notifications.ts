import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const ACTOR_SELECT = { id: true, username: true, profilePhotoUrl: true } as const;

router.get("/", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

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
