import { Router } from "express";
import { z } from "zod";
import { notify } from "../lib/notifications.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const USER_SELECT = { id: true, username: true, email: true, profilePhotoUrl: true } as const;

const createSchema = z.object({ followeeId: z.string().uuid() });

router.post("/requests", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const followerId = req.userId!;
  const { followeeId } = parsed.data;

  if (followeeId === followerId) {
    res.status(400).json({ error: "Cannot follow yourself" });
    return;
  }

  const followee = await prisma.user.findUnique({ where: { id: followeeId } });
  if (!followee) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId, followeeId } },
  });
  if (existing) {
    res.status(409).json({ error: `Follow already ${existing.status.toLowerCase()}` });
    return;
  }

  const follow = await prisma.follow.create({ data: { followerId, followeeId } });

  const follower = await prisma.user.findUnique({ where: { id: followerId }, select: { username: true } });
  await notify({
    userId: followeeId,
    type: "FOLLOW_REQUEST",
    actorId: followerId,
    data: { followId: follow.id },
    pushTitle: "New follow request",
    pushBody: `${follower?.username ?? "Someone"} wants to follow you`,
  });

  res.status(201).json({ follow });
});

router.get("/requests/incoming", async (req, res) => {
  const requests = await prisma.follow.findMany({
    where: { followeeId: req.userId, status: "PENDING" },
    include: { follower: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ requests });
});

router.get("/requests/outgoing", async (req, res) => {
  const requests = await prisma.follow.findMany({
    where: { followerId: req.userId, status: "PENDING" },
    include: { followee: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ requests });
});

router.post("/requests/:id/approve", async (req, res) => {
  const follow = await prisma.follow.findUnique({ where: { id: req.params.id } });
  if (!follow || follow.followeeId !== req.userId) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const updated = await prisma.follow.update({
    where: { id: follow.id },
    data: { status: "APPROVED" },
  });

  // The incoming-request notification has served its purpose — without this
  // it never goes away and reappears with live Accept/Deny buttons on every
  // future fetch, since GET /notifications otherwise has no idea it was resolved.
  await prisma.notification.deleteMany({
    where: { type: "FOLLOW_REQUEST", data: { path: ["followId"], equals: follow.id } },
  });

  const followee = await prisma.user.findUnique({ where: { id: follow.followeeId }, select: { username: true } });
  await notify({
    userId: follow.followerId,
    type: "FOLLOW_ACCEPTED",
    actorId: follow.followeeId,
    data: { followId: follow.id },
    pushTitle: "Follow request accepted",
    pushBody: `${followee?.username ?? "Someone"} accepted your follow request`,
  });

  res.json({ follow: updated });
});

router.post("/requests/:id/deny", async (req, res) => {
  const follow = await prisma.follow.findUnique({ where: { id: req.params.id } });
  if (!follow || follow.followeeId !== req.userId) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  await prisma.follow.delete({ where: { id: follow.id } });
  await prisma.notification.deleteMany({
    where: { type: "FOLLOW_REQUEST", data: { path: ["followId"], equals: follow.id } },
  });
  res.status(204).send();
});

router.get("/following", async (req, res) => {
  const follows = await prisma.follow.findMany({
    where: { followerId: req.userId, status: "APPROVED" },
    include: { followee: { select: USER_SELECT } },
  });
  res.json({ following: follows.map((f) => f.followee) });
});

router.get("/followers", async (req, res) => {
  const follows = await prisma.follow.findMany({
    where: { followeeId: req.userId, status: "APPROVED" },
    include: { follower: { select: USER_SELECT } },
  });
  res.json({ followers: follows.map((f) => f.follower) });
});

const SUGGESTION_LIMIT = 20;

// "People followed by people you follow" — pure second-degree-connection
// suggestions from the existing follow graph, no new data collection. People
// who already follow you (but you don't follow back) ARE eligible here —
// only people you already follow, or already have a pending request to,
// are excluded.
router.get("/suggestions", async (req, res) => {
  const userId = req.userId!;

  const myOutgoing = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followeeId: true, status: true },
  });
  const excludeIds = new Set<string>([userId, ...myOutgoing.map((f) => f.followeeId)]);
  const followeeIds = myOutgoing.filter((f) => f.status === "APPROVED").map((f) => f.followeeId);

  if (followeeIds.length === 0) {
    res.json({ suggestions: [] });
    return;
  }

  const secondDegree = await prisma.follow.findMany({
    where: { followerId: { in: followeeIds }, status: "APPROVED" },
    select: { followeeId: true },
  });

  const mutualCounts = new Map<string, number>();
  for (const f of secondDegree) {
    if (excludeIds.has(f.followeeId)) continue;
    mutualCounts.set(f.followeeId, (mutualCounts.get(f.followeeId) ?? 0) + 1);
  }

  const topIds = [...mutualCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SUGGESTION_LIMIT)
    .map(([id]) => id);

  if (topIds.length === 0) {
    res.json({ suggestions: [] });
    return;
  }

  const users = await prisma.user.findMany({ where: { id: { in: topIds } }, select: USER_SELECT });
  const usersById = new Map(users.map((u) => [u.id, u]));

  const suggestions = topIds
    .map((id) => {
      const user = usersById.get(id);
      return user ? { ...user, mutualCount: mutualCounts.get(id)! } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  res.json({ suggestions });
});

export default router;
