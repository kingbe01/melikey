import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const searchSchema = z.object({ q: z.string().min(1) });

router.get("/search", async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { q } = parsed.data;

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.userId },
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, username: true, email: true },
    take: 20,
  });

  res.json({ users });
});

export default router;
