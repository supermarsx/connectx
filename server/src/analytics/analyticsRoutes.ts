import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import { analyticsService } from "./analyticsService.js";
import * as connectionManager from "../ws/connectionManager.js";

export const analyticsRouter = Router();

// All analytics endpoints require authentication
analyticsRouter.use(authMiddleware);

/**
 * GET /analytics/summary
 * Returns aggregated analytics data.
 */
analyticsRouter.get("/summary", async (_req, res, next) => {
  try {
    const summary = await analyticsService.getAnalyticsSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /analytics/health
 * Returns basic health metrics: uptime, connections, active matches.
 */
analyticsRouter.get("/health", async (_req, res, next) => {
  try {
    let onlineCount = 0;
    try {
      onlineCount = await connectionManager.getOnlineCount();
    } catch {
      // ignore
    }

    res.json({
      uptime: process.uptime(),
      connections: onlineCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
