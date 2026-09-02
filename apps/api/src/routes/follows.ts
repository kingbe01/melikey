import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const USER_SELECT = { id: true, username: true, email: true } as const;

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
  res.json({ follow: updated });
});

router.post("/requests/:id/deny", async (req, res) => {
  const follow = await prisma.follow.findUnique({ where: { id: req.params.id } });
  if (!follow || follow.followeeId !== req.userId) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  await prisma.follow.delete({ where: { id: follow.id } });
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

export default router;
