import "dotenv/config";
// Forwards errors thrown in async route handlers to the error handler below —
// Express 4 otherwise leaves them as unhandled rejections.
import "express-async-errors";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { PRIVACY_CHOICES_HTML, PRIVACY_POLICY_HTML, SUPPORT_HTML, TERMS_OF_SERVICE_HTML } from "./lib/legalPages.js";
import { prisma } from "./lib/prisma.js";
import { requestLog } from "./middleware/requestLog.js";
import authRouter from "./routes/auth.js";
import businessesRouter from "./routes/businesses.js";
import exportRouter from "./routes/export.js";
import feedRouter from "./routes/feed.js";
import followsRouter from "./routes/follows.js";
import likeysRouter from "./routes/likeys.js";
import mediaItemsRouter from "./routes/mediaItems.js";
import notificationsRouter from "./routes/notifications.js";
import reportsRouter from "./routes/reports.js";
import usersRouter from "./routes/users.js";

const app = express();
app.use(cors());
app.use(requestLog);
// raised from the default 100kb to fit an inline base64 Likey photo (see routes/likeys.ts)
app.use(express.json({ limit: "3mb" }));

app.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

// Public, unauthenticated — linked from the app's About screen and App Store Connect metadata.
app.get("/privacy", (_req, res) => res.type("html").send(PRIVACY_POLICY_HTML));
app.get("/terms", (_req, res) => res.type("html").send(TERMS_OF_SERVICE_HTML));
app.get("/privacy-choices", (_req, res) => res.type("html").send(PRIVACY_CHOICES_HTML));
app.get("/support", (_req, res) => res.type("html").send(SUPPORT_HTML));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/follows", followsRouter);
app.use("/businesses", businessesRouter);
app.use("/likeys", likeysRouter);
app.use("/media-items", mediaItemsRouter);
app.use("/feed", feedRouter);
app.use("/notifications", notificationsRouter);
app.use("/export", exportRouter);
app.use("/reports", reportsRouter);

// Last-resort handler: log the stack so it shows up in the DO runtime logs,
// and give the client a clean JSON 500 instead of a hung request.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(`ERROR ${req.method} ${req.originalUrl.split("?")[0]}`, err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection", reason);
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`melikey api listening on :${port}`);
});
