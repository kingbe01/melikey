import "dotenv/config";
import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma.js";
import authRouter from "./routes/auth.js";
import businessesRouter from "./routes/businesses.js";
import feedRouter from "./routes/feed.js";
import followsRouter from "./routes/follows.js";
import likeysRouter from "./routes/likeys.js";
import usersRouter from "./routes/users.js";

const app = express();
app.use(cors());
// raised from the default 100kb to fit an inline base64 Likey photo (see routes/likeys.ts)
app.use(express.json({ limit: "3mb" }));

app.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/follows", followsRouter);
app.use("/businesses", businessesRouter);
app.use("/likeys", likeysRouter);
app.use("/feed", feedRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`melikey api listening on :${port}`);
});
