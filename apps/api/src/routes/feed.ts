import { Router } from "express";
import { z } from "zod";
import { findFeed } from "../lib/geo.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const feedSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMiles: z.coerce.number().positive().max(500).optional().default(10),
});

router.get("/", async (req, res) => {
  const parsed = feedSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { lat, lng, radiusMiles } = parsed.data;

  const follows = await prisma.follow.findMany({
    where: { followerId: req.userId, status: "APPROVED" },
    select: { followeeId: true },
  });
  const followeeIds = follows.map((f) => f.followeeId);

  const feed = await findFeed(followeeIds, lat, lng, radiusMiles);
  res.json({ feed });
});

export default router;
