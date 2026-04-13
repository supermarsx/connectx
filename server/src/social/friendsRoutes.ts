import { Router } from "express";
import { authMiddleware } from "../auth/authMiddleware.js";
import * as friendsService from "./friendsService.js";
import * as connectionManager from "../ws/connectionManager.js";
import { getDb } from "../db/provider.js";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

export const friendsRouter = Router();

// All friends endpoints require authentication
friendsRouter.use(authMiddleware);

/**
 * GET /friends/search
 * Search users by username.
 */
friendsRouter.get("/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = String(req.query.username ?? '').trim();
    if (!username || username.length < 2) {
      res.status(400).json({ message: 'Username query must be at least 2 characters' });
      return;
    }
    const db = getDb();
    const results = await db.query<{ id: string; username: string; rating?: number }>(
      `SELECT id, username, rating FROM users WHERE LOWER(username) LIKE $1 LIMIT 10`,
      [`%${username.toLowerCase()}%`]
    );
    res.json({ users: results.rows.map((r) => ({ userId: r.id, username: r.username, rating: r.rating ?? 1200 })) });
  } catch (err) {
    next(err);
  }
});

const friendIdSchema = z.object({
  friendId: z.string().uuid(),
});

const requesterIdSchema = z.object({
  requesterId: z.string().uuid(),
});

function validate<T>(schema: z.ZodSchema<T>, data: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues.map((i) => i.message).join(", ") };
  }
  return { data: result.data };
}

/**
 * POST /friends/request
 * Send a friend request.
 */
friendsRouter.post("/request", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = validate(friendIdSchema, req.body);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const userId = req.user!.id;
    const result = await friendsService.sendFriendRequest(userId, parsed.data.friendId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: "Friend request sent" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /friends/accept
 * Accept a pending friend request.
 */
friendsRouter.post("/accept", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = validate(requesterIdSchema, req.body);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const userId = req.user!.id;
    const result = await friendsService.acceptFriendRequest(userId, parsed.data.requesterId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /friends/decline
 * Decline a pending friend request.
 */
friendsRouter.post("/decline", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = validate(requesterIdSchema, req.body);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const userId = req.user!.id;
    const result = await friendsService.declineFriendRequest(userId, parsed.data.requesterId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: "Friend request declined" });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /friends/:userId
 * Remove a friend.
 */
friendsRouter.delete("/:userId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const friendId = req.params.userId as string;
    if (!friendId || !z.string().uuid().safeParse(friendId).success) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const userId = req.user!.id;
    const result = await friendsService.removeFriend(userId, friendId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: "Friend removed" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /friends
 * List accepted friends with online status.
 */
friendsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const friends = await friendsService.getFriends(userId);

    // Enrich with online status
    for (const friend of friends) {
      try {
        const state = await connectionManager.getPlayerState(friend.userId);
        friend.isOnline = state !== null;
      } catch {
        friend.isOnline = false;
      }
    }

    res.json({ friends });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /friends/pending
 * List incoming pending friend requests.
 */
friendsRouter.get("/pending", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const requests = await friendsService.getPendingRequests(userId);
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});
