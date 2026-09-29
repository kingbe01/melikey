import type { NextFunction, Request, Response } from "express";

// One line per request so a reviewer/user report ("login showed an error on
// Sept 29") can be matched against what the server actually saw. Never logs
// request bodies — routes can attach a short, non-sensitive note via
// res.locals.logNote (e.g. why a login was rejected).
export function requestLog(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const client = [req.get("x-app-version"), req.get("x-app-build"), req.get("x-device"), req.get("x-os")]
      .filter(Boolean)
      .join(" ");
    const parts = [
      `${req.method} ${req.originalUrl.split("?")[0]}`,
      res.statusCode,
      `${ms.toFixed(0)}ms`,
      req.userId ? `user=${req.userId}` : null,
      client ? `client="${client}"` : `ua="${req.get("user-agent") ?? ""}"`,
      res.locals.logNote ? `note="${res.locals.logNote}"` : null,
    ];
    console.log(parts.filter((p) => p !== null).join(" "));
  });

  next();
}

// "ap***@example.com" — enough to recognize an account in logs without
// writing full addresses into them.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}
