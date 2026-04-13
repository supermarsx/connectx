import { Router } from "express";
import { z } from "zod";
import { query } from "../db/provider.js";
import { authMiddleware } from "../auth/authMiddleware.js";

export const profileRouter = Router();

// ── Validation ──

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(64).optional(),
  preferred_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
  avatar_url: z.string().url().max(2048).optional(),
});

// ── GET /profile/:id ──

profileRouter.get("/:id", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, username, display_name, avatar_url, rating,
              games_played, wins, losses, draws
       FROM users WHERE id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── PUT /profile/me ──

profileRouter.put("/me", authMiddleware, async (req, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const fields = parsed.data;
    if (Object.keys(fields).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const ALLOWED_FIELDS = new Set(['display_name', 'preferred_color', 'avatar_url']);
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }
    setClauses.push(`updated_at = NOW()`);
    values.push(req.user!.id);

    const result = await query(
      `UPDATE users SET ${setClauses.join(", ")}
       WHERE id = $${idx}
       RETURNING id, username, email, display_name, preferred_color, avatar_url,
                 rating, games_played, wins, losses, draws, updated_at`,
      values,
    );

    res.json({ profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── GET /profile/me/stats ──

profileRouter.get("/me/stats", authMiddleware, async (req, res, next) => {
  try {
    const userResult = await query(
      `SELECT id, username, display_name, rating, rating_deviation,
              games_played, wins, losses, draws
       FROM users WHERE id = $1`,
      [req.user!.id],
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const recentResult = await query(
      `SELECT mh.id, mh.mode, mh.connect_n, mh.is_draw, mh.created_at,
              mp.score, mp.rating_before, mp.rating_after,
              mh.winner_id
       FROM match_players mp
       JOIN match_history mh ON mh.id = mp.match_id
       WHERE mp.user_id = $1
       ORDER BY mh.created_at DESC
       LIMIT 10`,
      [req.user!.id],
    );

    res.json({
      stats: userResult.rows[0],
      recentMatches: recentResult.rows,
    });
  } catch (err) {
    next(err);
  }
});
