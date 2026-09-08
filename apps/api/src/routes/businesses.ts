import { Router } from "express";
import { z } from "zod";
import { searchNearbyPlaces, searchPlacesByName } from "../lib/appleMaps.js";
import { findNearbyBusinesses } from "../lib/geo.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// General (service-provider) recommendations, e.g. "who do you use for X" —
// a fixed, closed list rather than free text, matching the product decision
// to keep this a simple pre-select rather than an open category system.
export const SERVICE_SUBCATEGORIES = [
  "Landscaping",
  "Painting",
  "HVAC",
  "Electrical",
  "Plumbing",
  "Drywall",
  "General Repair",
] as const;

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMiles: z.coerce.number().positive().max(500).optional().default(10),
  q: z.string().min(1).optional(),
});

// A SUGGESTION_PREFIX-prefixed id marks an Apple Maps result that isn't
// saved as a Business yet — POST / (below) creates it on first use.
const SUGGESTION_PREFIX = "suggestion:";
const COMMUNITY_RESULTS_FALLBACK_THRESHOLD = 5;

// v1: primary source is businesses the community has already logged nearby.
// When that's sparse (cold-start areas), we fall back to Apple Maps search so
// there's still something to pick from; manual entry always covers the rest.
// Passing "q" (the place isn't turning up in that browse list) instead
// searches Apple Maps by that name directly, skipping the fallback gating.
router.get("/nearby", async (req, res) => {
  const parsed = nearbySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { lat, lng, radiusMiles, q } = parsed.data;

  if (q) {
    const community = await findNearbyBusinesses(lat, lng, radiusMiles, 20, q);
    const placeSuggestions = await searchPlacesByName(q, lat, lng, radiusMiles);
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
    return;
  }

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

const createSchema = z
  .object({
    name: z.string().min(1).max(120),
    category: z.enum(["restaurant", "entertainment", "general"]),
    subcategory: z.enum(SERVICE_SUBCATEGORIES).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    // Free-text, not validated against a format — international phone
    // numbers vary too much to usefully enforce a pattern here.
    phone: z.string().max(30).optional(),
    email: z.string().email().max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    externalPlaceId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === "general" && !data.subcategory) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subcategory"], message: "Subcategory is required" });
    }
    // Restaurant/entertainment still come from a map lookup or a location
    // snapshot at creation time, so they always have coordinates; "general"
    // is manual-entry only and has no reliable coordinate to attach.
    if (data.category !== "general" && (data.latitude === undefined || data.longitude === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude/longitude are required" });
    }
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

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    category: z.enum(["restaurant", "entertainment", "general"]).optional(),
    subcategory: z.enum(SERVICE_SUBCATEGORIES).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    phone: z.string().max(30).nullable().optional(),
    email: z.string().email().max(200).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === "general" && !data.subcategory) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subcategory"], message: "Subcategory is required" });
    }
  });

// Editable only for manually-entered places (no externalPlaceId) — one shared
// by an Apple Maps lookup could belong to many other people's posts too, so
// letting one person edit it here would silently change what everyone else
// sees. Also requires the requester to have actually posted about it.
router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) {
    res.status(404).json({ error: "Place not found" });
    return;
  }
  if (business.externalPlaceId) {
    res.status(403).json({ error: "This place is shared and can't be edited here" });
    return;
  }
  const ownsAPost = await prisma.likey.findFirst({ where: { businessId: business.id, userId: req.userId } });
  if (!ownsAPost) {
    res.status(403).json({ error: "You can only edit a place you've posted about" });
    return;
  }

  const updated = await prisma.business.update({ where: { id: business.id }, data: parsed.data });
  res.json({ business: updated });
});

export default router;
