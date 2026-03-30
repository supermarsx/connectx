import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import { leaderboardService } from "./leaderboardService.js";

export const leaderboardRouter = Router();

// GET /leaderboard/global
leaderboardRouter.get("/global", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20),
    );

    const entries = await leaderboardService.getGlobalLeaderboard(page, limit);
    res.json({ page, limit, entries });
  } catch (err) {
    console.error("[leaderboard] Error fetching global leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// GET /leaderboard/rank/:userId
leaderboardRouter.get("/rank/:userId", async (req, res) => {
  try {
    const userId = req.params.userId as string;
    const rank = await leaderboardService.getPlayerRank(userId);
    res.json({ userId, rank });
  } catch (err) {
    console.error("[leaderboard] Error fetching rank:", err);
    res.status(500).json({ error: "Failed to fetch rank" });
  }
});

// GET /leaderboard/stats/:userId
leaderboardRouter.get("/stats/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId as string;
    const stats = await leaderboardService.getPlayerStats(userId);
    if (!stats) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ userId, ...stats });
  } catch (err) {
    console.error("[leaderboard] Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /leaderboard/matches/:userId
leaderboardRouter.get("/matches/:userId", async (req, res) => {
  try {
    const userId = req.params.userId as string;
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 10),
    );
    const matches = await leaderboardService.getRecentMatches(
      userId,
      limit,
    );
    res.json({ userId, matches });
  } catch (err) {
    console.error("[leaderboard] Error fetching matches:", err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});
