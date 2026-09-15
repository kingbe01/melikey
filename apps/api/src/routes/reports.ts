import { Router } from "express";
import { z } from "zod";
import { CONTACT_EMAIL } from "../lib/legalPages.js";
import { sendEmail } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  targetType: z.enum(["LIKEY", "USER"]),
  targetId: z.string().uuid(),
  reason: z.enum(["SPAM", "HARASSMENT", "INAPPROPRIATE", "OTHER"]),
  note: z.string().max(500).optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { targetType, targetId, reason, note } = parsed.data;
  const reporterId = req.userId!;

  const exists =
    targetType === "LIKEY"
      ? await prisma.likey.findUnique({ where: { id: targetId } })
      : await prisma.user.findUnique({ where: { id: targetId } });
  if (!exists) {
    res.status(404).json({ error: `${targetType === "LIKEY" ? "Likey" : "User"} not found` });
    return;
  }

  const report = await prisma.report.create({
    data: { reporterId, targetType, targetId, reason, note },
  });

  const reporter = await prisma.user.findUnique({ where: { id: reporterId }, select: { username: true } });
  // Best-effort — a failed notification email shouldn't fail the report
  // itself, since the report is already durably stored either way.
  await sendEmail(
    CONTACT_EMAIL,
    `New report: ${targetType} · ${reason}`,
    `<p><strong>${reporter?.username ?? reporterId}</strong> reported a ${targetType.toLowerCase()}.</p>
     <p><strong>Reason:</strong> ${reason}</p>
     ${note ? `<p><strong>Note:</strong> ${note}</p>` : ""}
     <p><strong>Target ID:</strong> ${targetId}</p>
     <p><strong>Report ID:</strong> ${report.id}</p>`
  ).catch(() => {});

  res.status(201).json({ report });
});

export default router;
