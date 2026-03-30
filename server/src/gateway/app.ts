import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { authRouter } from "../auth/authRoutes.js";
import { profileRouter } from "../profile/profileRoutes.js";
import { discoveryRouter } from "../discovery/discoveryRoutes.js";
import { leaderboardRouter } from "../leaderboard/leaderboardRoutes.js";
import { moderationRouter } from "../moderation/moderationRoutes.js";

export function createApp() {
  const app = express();

  // ── Security headers ──
  app.use(helmet());

  // ── CORS ──
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // ── Body parsing ──
  app.use(express.json({ limit: "1mb" }));

  // ── Rate limiting ──
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many auth attempts, please try again later" },
  });

  app.use("/api", generalLimiter);
  app.use("/api/auth", authLimiter);

  // ── Routes ──
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/rooms", discoveryRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/moderation", moderationRouter);

  // ── Health check ──
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Error handler ──
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[server] Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
