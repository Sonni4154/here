import { ExpressAuth } from "@auth/express";
import type { Express } from "express";
import { authConfig } from "./nextauth-config";

export function setupNextAuth(app: Express) {
  app.set("trust proxy", 1);
  
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn("⚠️  AUTH_SECRET/NEXTAUTH_SECRET not set; set it in .env for production!");
  }

  app.use(
    "/api/auth/*",
    ExpressAuth({
      ...authConfig,
      secret,
      trustHost: true, // behind TLS proxy
    })
  );

  // Example protected test route
  app.get("/api/protected/ping", (_req, res) => {
    res.json({ ok: true });
  });
}