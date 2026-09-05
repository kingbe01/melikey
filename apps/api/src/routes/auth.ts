import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import { sendEmail } from "../lib/email.js";
import { signToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

function generateResetCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashResetCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

const signupSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  password: z.string().min(8),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, username, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    res.status(409).json({ error: "Email or username already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, passwordHash },
  });

  const token = signToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

const forgotPasswordSchema = z.object({ email: z.string().email() });

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same way regardless of whether the email is
  // registered, so this endpoint can't be used to enumerate accounts.
  if (user) {
    const code = generateResetCode();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash: hashResetCode(code),
        expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
      },
    });
    await sendEmail(
      user.email,
      "Your melikey password reset code",
      `<p>Your password reset code is:</p><h2 style="letter-spacing: 4px;">${code}</h2><p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`
    );
  }

  res.json({ message: "If that email is registered, a reset code has been sent." });
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: z.string().min(8),
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, code, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const resetToken = user
    ? await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          codeHash: hashResetCode(code),
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  if (!user || !resetToken) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, username: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

export default router;
