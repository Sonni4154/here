import { ExpressAuth } from "@auth/express";
import type { Express } from "express";
import { authConfig } from "./nextauth-config";

export function setupNextAuth(app: Express) {
  // Set up NextAuth.js routes
  app.use("/api/auth/*", ExpressAuth(authConfig));
  
  // Custom middleware to protect routes
  app.use("/api/protected/*", async (req, res, next) => {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = session.user;
    next();
  });
}

// Helper function to get session
async function getSession(req: any) {
  try {
    // This would need to be implemented based on how Express Auth handles sessions
    // For now, we'll integrate with the existing session handling
    return req.session?.user || null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export { getSession };