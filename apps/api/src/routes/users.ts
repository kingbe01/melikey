import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const USER_SELECT = { id: true, username: true, email: true, profilePhotoUrl: true } as const;

// Both directions — a block hides that person from you AND you from them.
async function blockedUserIds(userId: string): Promise<Set<string>> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]).filter((id) => id !== userId));
}

const searchSchema = z.object({ q: z.string().min(1) });

router.get("/search", async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { q } = parsed.data;
  const excludeIds = await blockedUserIds(req.userId!);
  excludeIds.add(req.userId!);

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: [...excludeIds] },
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: USER_SELECT,
    take: 20,
  });

  res.json({ users });
});

router.get("/blocked", async (req, res) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: req.userId },
    include: { blocked: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ blocked: blocks.map((b) => b.blocked) });
});

router.post("/:id/block", async (req, res) => {
  const blockerId = req.userId!;
  const blockedId = req.params.id;

  if (blockedId === blockerId) {
    res.status(400).json({ error: "Cannot block yourself" });
    return;
  }
  const target = await prisma.user.findUnique({ where: { id: blockedId } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });

  // Severs the relationship both ways — a block means neither side should
  // see the other's content or be able to re-follow.
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: blockerId, followeeId: blockedId },
        { followerId: blockedId, followeeId: blockerId },
      ],
    },
  });

  res.status(201).json({ ok: true });
});

router.delete("/:id/block", async (req, res) => {
  await prisma.block.deleteMany({ where: { blockerId: req.userId, blockedId: req.params.id } });
  res.status(204).send();
});

export default router;
export { blockedUserIds };
