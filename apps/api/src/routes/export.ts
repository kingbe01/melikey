import { Router } from "express";
import { z } from "zod";
import { buildLikeysWorkbook } from "../lib/exportXlsx.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const CATEGORIES = ["restaurant", "entertainment", "general", "media"] as const;

const exportSchema = z.object({
  scope: z.enum(["mine", "friends", "both"]).default("mine"),
  categories: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",") : [...CATEGORIES]))
    .pipe(z.array(z.enum(CATEGORIES)).min(1)),
});

router.get("/likeys", async (req, res) => {
  const parsed = exportSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { scope, categories } = parsed.data;

  let userIds: string[] = [];
  if (scope === "mine" || scope === "both") {
    userIds.push(req.userId!);
  }
  if (scope === "friends" || scope === "both") {
    const follows = await prisma.follow.findMany({
      where: { followerId: req.userId, status: "APPROVED" },
      select: { followeeId: true },
    });
    userIds.push(...follows.map((f) => f.followeeId));
  }
  userIds = [...new Set(userIds)];

  const businessCategories = categories.filter((c) => c !== "media");
  const wantsMedia = categories.includes("media");

  const likeys =
    userIds.length === 0
      ? []
      : await prisma.likey.findMany({
          where: {
            userId: { in: userIds },
            OR: [
              ...(businessCategories.length > 0 ? [{ business: { category: { in: businessCategories } } }] : []),
              ...(wantsMedia ? [{ mediaItemId: { not: null } }] : []),
            ],
          },
          include: { business: true, mediaItem: true, user: { select: { username: true } } },
          orderBy: { createdAt: "desc" },
        });

  const buffer = await buildLikeysWorkbook(
    likeys.map((l) => ({
      author: l.user.username,
      category: l.business?.category ?? "media",
      subcategory: l.business?.subcategory ?? l.mediaItem?.type ?? null,
      name: l.business?.name ?? l.mediaItem?.title ?? "",
      city: l.business?.city ?? null,
      state: l.business?.state ?? null,
      tier: l.tier,
      comment: l.comment,
      hasPhoto: !!l.photoUrl,
      createdAt: l.createdAt,
    }))
  );

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="melikey-export.xlsx"');
  res.send(buffer);
});

export default router;
