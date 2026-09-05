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

router.get("/mine", async (req, res) => {
  const likeys = await prisma.likey.findMany({
    where: { userId: req.userId },
    include: { business: true },
    orderBy: { createdAt: "desc" },
  });
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

export default router;
