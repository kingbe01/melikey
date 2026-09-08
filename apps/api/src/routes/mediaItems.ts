import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Fixed pre-select, same precedent as Business.subcategory's service list —
// not open text entry.
export const MEDIA_TYPES = ["Book", "Movie", "TV Show"] as const;

const createSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(MEDIA_TYPES),
  creator: z.string().max(120).optional(),
  year: z.string().max(10).optional(),
});

// No external lookup (Open Library/TMDB) for v1 — manual entry only, same
// as General/Services. Each submission creates its own row; no dedup key
// exists yet to merge two people's identical entries.
router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const mediaItem = await prisma.mediaItem.create({ data: parsed.data });
  res.status(201).json({ mediaItem });
});

export default router;
