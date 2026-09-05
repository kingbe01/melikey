import { Router } from "express";
import { z } from "zod";
import { searchNearbyPlaces } from "../lib/appleMaps.js";
import { findNearbyBusinesses } from "../lib/geo.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMiles: z.coerce.number().positive().max(500).optional().default(10),
});

// A SUGGESTION_PREFIX-prefixed id marks an Apple Maps result that isn't
// saved as a Business yet — POST / (below) creates it on first use.
const SUGGESTION_PREFIX = "suggestion:";
const COMMUNITY_RESULTS_FALLBACK_THRESHOLD = 5;

// v1: primary source is businesses the community has already logged nearby.
// When that's sparse (cold-start areas), we fall back to Apple Maps search so
// there's still something to pick from; manual entry always covers the rest.
router.get("/nearby", async (req, res) => {
  const parsed = nearbySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { lat, lng, radiusMiles } = parsed.data;
  const community = await findNearbyBusinesses(lat, lng, radiusMiles);

  if (community.length >= COMMUNITY_RESULTS_FALLBACK_THRESHOLD) {
    res.json({ businesses: community });
    return;
  }

  const placeSuggestions = await searchNearbyPlaces(lat, lng, radiusMiles);
  const alreadySaved = new Set(
    (
      await prisma.business.findMany({
        where: { externalPlaceId: { in: placeSuggestions.map((p) => p.externalPlaceId) } },
        select: { externalPlaceId: true },
      })
    ).map((b) => b.externalPlaceId)
  );

  const suggestions = placeSuggestions
    .filter((p) => !alreadySaved.has(p.externalPlaceId))
    .map((p) => ({ ...p, id: `${SUGGESTION_PREFIX}${p.externalPlaceId}` }));

  const businesses = [...community, ...suggestions].sort((a, b) => a.distanceMiles - b.distanceMiles);
  res.json({ businesses });
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["restaurant", "entertainment"]),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  externalPlaceId: z.string().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { externalPlaceId, ...data } = parsed.data;

  // Upsert on externalPlaceId so two people logging the same Apple-suggested
  // place around the same time land on one Business row, not two.
  const business = externalPlaceId
    ? await prisma.business.upsert({
        where: { externalPlaceId },
        create: { ...data, externalPlaceId },
        update: {},
      })
    : await prisma.business.create({ data });

  res.status(201).json({ business });
});

export default router;
