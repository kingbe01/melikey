import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  businessId: z.string().uuid(),
  tier: z.enum(["LIKED", "FINE", "DISLIKED"]),
  comment: z.string().max(200).optional(),
  // ~2M base64 chars =~ 1.5MB decoded image; keeps request bodies bounded.
  photoBase64: z.string().max(2_000_000).optional(),
});

const TIER_RANK = { LIKED: 0, FINE: 1, DISLIKED: 2 } as const;

const likeyFiltersSchema = z.object({
  q: z.string().optional(),
  category: z.enum(["restaurant", "entertainment"]).optional(),
  tier: z.enum(["LIKED", "FINE", "DISLIKED"]).optional(),
  sort: z.enum(["recent", "oldest", "tier", "business"]).optional().default("recent"),
});

async function findLikeysForUser(userId: string, filters: z.infer<typeof likeyFiltersSchema>) {
  const { q, category, tier, sort } = filters;

  const results = await prisma.likey.findMany({
    where: {
      userId,
      tier,
      business: { category },
      ...(q
        ? { OR: [{ comment: { contains: q, mode: "insensitive" } }, { business: { name: { contains: q, mode: "insensitive" } } }] }
        : {}),
    },
    include: { business: true },
    orderBy:
      sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "business"
          ? { business: { name: "asc" } }
          : { createdAt: "desc" },
  });

  return sort === "tier" ? [...results].sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]) : results;
}

router.get("/mine", async (req, res) => {
  const parsed = likeyFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const likeys = await findLikeysForUser(req.userId!, parsed.data);
  res.json({ likeys });
});

// Only visible to someone the target user has approved as a follower —
// mirrors the feed's "followed friends only" model, not a public profile.
router.get("/user/:id", async (req, res) => {
  const parsed = likeyFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const targetId = req.params.id;

  if (targetId !== req.userId) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: req.userId!, followeeId: targetId } },
    });
    if (!follow || follow.status !== "APPROVED") {
      res.status(403).json({ error: "You must follow this user to see their Likeys" });
      return;
    }
  }

  const likeys = await findLikeysForUser(targetId, parsed.data);
  res.json({ likeys });
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { businessId, tier, comment, photoBase64 } = parsed.data;

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const likey = await prisma.likey.create({
    data: {
      userId: req.userId!,
      businessId,
      tier,
      comment,
      // v1 stopgap: photo stored inline as a data URL until object storage is
      // chosen (Neon is fine at dogfood scale; revisit before wider rollout).
      photoUrl: photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : undefined,
    },
    include: { business: true },
  });

  res.status(201).json({ likey });
});

const updateSchema = z.object({
  tier: z.enum(["LIKED", "FINE", "DISLIKED"]).optional(),
  comment: z.string().max(200).nullable().optional(),
  photoBase64: z.string().max(2_000_000).nullable().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.likey.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: "Likey not found" });
    return;
  }

  const { tier, comment, photoBase64 } = parsed.data;
  const likey = await prisma.likey.update({
    where: { id: existing.id },
    data: {
      tier,
      ...(comment !== undefined ? { comment } : {}),
      ...(photoBase64 !== undefined
        ? { photoUrl: photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : null }
        : {}),
    },
    include: { business: true },
  });

  res.json({ likey });
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.likey.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: "Likey not found" });
    return;
  }

  await prisma.likey.delete({ where: { id: existing.id } });
  res.status(204).send();
});

export default router;
