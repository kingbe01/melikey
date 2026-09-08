import { Router } from "express";
import { z } from "zod";
import { notifyMany } from "../lib/notifications.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { SERVICE_SUBCATEGORIES } from "./businesses.js";
import { MEDIA_TYPES } from "./mediaItems.js";

const router = Router();
router.use(requireAuth);

const USER_SELECT = { id: true, username: true, profilePhotoUrl: true } as const;

const createSchema = z
  .object({
    businessId: z.string().uuid().optional(),
    mediaItemId: z.string().uuid().optional(),
    tier: z.enum(["LIKED", "FINE", "DISLIKED"]),
    comment: z.string().max(200).optional(),
    // ~2M base64 chars =~ 1.5MB decoded image; keeps request bodies bounded.
    photoBase64: z.string().max(2_000_000).optional(),
  })
  .refine((data) => !!data.businessId !== !!data.mediaItemId, {
    message: "Provide exactly one of businessId or mediaItemId",
  });

const TIER_RANK = { LIKED: 0, FINE: 1, DISLIKED: 2 } as const;

const likeyFiltersSchema = z.object({
  q: z.string().optional(),
  category: z.enum(["restaurant", "entertainment", "general", "media"]).optional(),
  tier: z.enum(["LIKED", "FINE", "DISLIKED"]).optional(),
  sort: z.enum(["recent", "oldest", "tier", "business"]).optional().default("recent"),
});

async function findLikeysForUser(userId: string, filters: z.infer<typeof likeyFiltersSchema>) {
  const { q, category, tier, sort } = filters;

  const results = await prisma.likey.findMany({
    where: {
      userId,
      tier,
      ...(category === "media" ? { mediaItemId: { not: null } } : category ? { business: { category } } : {}),
      ...(q
        ? {
            OR: [
              { comment: { contains: q, mode: "insensitive" } },
              { business: { name: { contains: q, mode: "insensitive" } } },
              { mediaItem: { title: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { business: true, mediaItem: true },
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

const servicesFiltersSchema = z.object({
  q: z.string().optional(),
  subcategory: z.enum(SERVICE_SUBCATEGORIES).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

// General (service-provider) recommendations from people you follow —
// search/browse only, never surfaced in the location-based feed (see the
// product decision on keeping the "near me right now" feed restaurant/
// entertainment-only).
router.get("/services", async (req, res) => {
  const parsed = servicesFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { q, subcategory, city, state } = parsed.data;

  const follows = await prisma.follow.findMany({
    where: { followerId: req.userId, status: "APPROVED" },
    select: { followeeId: true },
  });
  const followeeIds = follows.map((f) => f.followeeId);
  if (followeeIds.length === 0) {
    res.json({ likeys: [] });
    return;
  }

  const likeys = await prisma.likey.findMany({
    where: {
      AND: [
        { userId: { in: followeeIds } },
        {
          business: {
            category: "general",
            subcategory,
            ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
            ...(state ? { state: { equals: state, mode: "insensitive" } } : {}),
          },
        },
        ...(q
          ? [{ OR: [{ comment: { contains: q, mode: "insensitive" as const } }, { business: { name: { contains: q, mode: "insensitive" as const } } }] }]
          : []),
      ],
    },
    include: { business: true, user: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    likeys: likeys.map(({ user, ...rest }) => ({ ...rest, author: user })),
  });
});

const mediaFiltersSchema = z.object({
  q: z.string().optional(),
  type: z.enum(MEDIA_TYPES).optional(),
});

// Books/movies/TV shows from people you follow — search/browse only, never
// surfaced in the location-based feed (they have no location at all).
router.get("/media", async (req, res) => {
  const parsed = mediaFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { q, type } = parsed.data;

  const follows = await prisma.follow.findMany({
    where: { followerId: req.userId, status: "APPROVED" },
    select: { followeeId: true },
  });
  const followeeIds = follows.map((f) => f.followeeId);
  if (followeeIds.length === 0) {
    res.json({ likeys: [] });
    return;
  }

  const likeys = await prisma.likey.findMany({
    where: {
      AND: [
        { userId: { in: followeeIds } },
        { mediaItem: { type } },
        ...(q
          ? [
              {
                OR: [
                  { comment: { contains: q, mode: "insensitive" as const } },
                  { mediaItem: { title: { contains: q, mode: "insensitive" as const } } },
                ],
              },
            ]
          : []),
      ],
    },
    include: { mediaItem: true, user: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  res.json({ likeys: likeys.map(({ user, ...rest }) => ({ ...rest, author: user })) });
});

// Single-post lookup, e.g. deep-linking from a "new Likey" notification.
// Same visibility rule as GET /user/:id: only the author or an approved follower can see it.
router.get("/:id", async (req, res) => {
  const likey = await prisma.likey.findUnique({
    where: { id: req.params.id },
    include: {
      business: true,
      mediaItem: true,
      user: { select: { id: true, username: true, profilePhotoUrl: true } },
    },
  });
  if (!likey) {
    res.status(404).json({ error: "Likey not found" });
    return;
  }

  if (likey.userId !== req.userId) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: req.userId!, followeeId: likey.userId } },
    });
    if (!follow || follow.status !== "APPROVED") {
      res.status(403).json({ error: "You must follow this user to see their Likeys" });
      return;
    }
  }

  const { user, ...rest } = likey;
  res.json({ likey: { ...rest, author: user } });
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { businessId, mediaItemId, tier, comment, photoBase64 } = parsed.data;

  let itemName: string;
  if (businessId) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    itemName = business.name;
  } else {
    const mediaItem = await prisma.mediaItem.findUnique({ where: { id: mediaItemId } });
    if (!mediaItem) {
      res.status(404).json({ error: "Media item not found" });
      return;
    }
    itemName = mediaItem.title;
  }

  const likey = await prisma.likey.create({
    data: {
      userId: req.userId!,
      businessId,
      mediaItemId,
      tier,
      comment,
      // v1 stopgap: photo stored inline as a data URL until object storage is
      // chosen (Neon is fine at dogfood scale; revisit before wider rollout).
      photoUrl: photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : undefined,
    },
    include: { business: true, mediaItem: true },
  });

  const [author, followers] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId! }, select: { username: true } }),
    prisma.follow.findMany({ where: { followeeId: req.userId!, status: "APPROVED" }, select: { followerId: true } }),
  ]);
  await notifyMany(
    followers.map((f) => f.followerId),
    "NEW_LIKEY",
    req.userId!,
    { likeyId: likey.id },
    "New Likey",
    `${author?.username ?? "Someone you follow"} liked ${itemName}`
  );

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
    include: { business: true, mediaItem: true },
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
