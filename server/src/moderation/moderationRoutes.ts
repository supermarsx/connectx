import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../auth/authMiddleware.js";
import { moderationService } from "./moderationService.js";

export const moderationRouter = Router();

// All moderation routes require auth
moderationRouter.use(authMiddleware);

const reportSchema = z.object({
  reportedId: z.string().uuid(),
  matchId: z.string().uuid().optional(),
  reason: z.string().min(1).max(255),
  details: z.string().max(2000).optional(),
});

const blockSchema = z.object({
  blockedId: z.string().uuid(),
});

// POST /moderation/report
moderationRouter.post("/report", async (req, res) => {
  try {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    const { reportedId, matchId, reason, details } = parsed.data;
    const reporterId = req.user!.id;

    if (reporterId === reportedId) {
      res.status(400).json({ error: "Cannot report yourself" });
      return;
    }

    await moderationService.reportPlayer(
      reporterId,
      reportedId,
      matchId ?? null,
      reason,
      details ?? "",
    );

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to report";
    if (message.includes("rate limit")) {
      res.status(429).json({ error: message });
      return;
    }
    console.error("[moderation] Report error:", err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// POST /moderation/block
moderationRouter.post("/block", async (req, res) => {
  try {
    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    const blockerId = req.user!.id;
    const { blockedId } = parsed.data;

    if (blockerId === blockedId) {
      res.status(400).json({ error: "Cannot block yourself" });
      return;
    }

    await moderationService.blockPlayer(blockerId, blockedId);
    res.json({ success: true });
  } catch (err) {
    console.error("[moderation] Block error:", err);
    res.status(500).json({ error: "Failed to block user" });
  }
});

// DELETE /moderation/block/:userId
moderationRouter.delete("/block/:userId", async (req, res) => {
  try {
    const blockerId = req.user!.id;
    const targetId = req.params.userId as string;
    await moderationService.unblockPlayer(blockerId, targetId);
    res.json({ success: true });
  } catch (err) {
    console.error("[moderation] Unblock error:", err);
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

// GET /moderation/blocked
moderationRouter.get("/blocked", async (req, res) => {
  try {
    const blocked = await moderationService.getBlockedUsers(req.user!.id);
    res.json({ blocked });
  } catch (err) {
    console.error("[moderation] Get blocked error:", err);
    res.status(500).json({ error: "Failed to get blocked users" });
  }
});
