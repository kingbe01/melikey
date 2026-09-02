import { Router } from "express";
import { z } from "zod";
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

// v1: suggestions are sourced from businesses the community has already logged
// nearby, not a Google Places lookup (that needs GCP billing set up, deferred).
// Manual entry below covers a place nobody has logged yet.
router.get("/nearby", async (req, res) => {
  const parsed = nearbySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { lat, lng, radiusMiles } = parsed.data;
  const businesses = await findNearbyBusinesses(lat, lng, radiusMiles);
  res.json({ businesses });
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["restaurant", "entertainment"]),
  address: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const business = await prisma.business.create({ data: parsed.data });
  res.status(201).json({ business });
});

export default router;
