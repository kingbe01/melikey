import { Router } from "express";
import { z } from "zod";
import { geocodeLocation } from "../lib/appleMaps.js";
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

const geocodeSchema = z.object({ q: z.string().min(1) });

// Lets the client search a location other than the device's current GPS
// position (e.g. planning a trip) — turns "Austin, TX" into coordinates,
// which the client then re-queries GET /feed with.
router.get("/geocode", async (req, res) => {
  const parsed = geocodeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const result = await geocodeLocation(parsed.data.q);
  if (!result) {
    res.status(404).json({ error: "Couldn't find that location" });
    return;
  }

  res.json(result);
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
