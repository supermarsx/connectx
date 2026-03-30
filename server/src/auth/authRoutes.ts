import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { hashPassword, verifyPassword } from "./passwordUtils.js";
import { authMiddleware } from "./authMiddleware.js";

export const authRouter = Router();

// ── Validation schemas ──

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username must be alphanumeric with underscores only",
    ),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Helpers ──

function signToken(payload: { id: string; username: string }): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

function sanitizeUser(row: Record<string, unknown>) {
  const { password_hash: _, ...rest } = row;
  return rest;
}

// ── POST /auth/register ──

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { username, email, password } = parsed.data;
    const hash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $1)
       RETURNING id, username, email, display_name, preferred_color, avatar_url,
                 rating, games_played, wins, losses, draws, created_at`,
      [username, email, hash],
    );

    const user = result.rows[0];
    const token = signToken({ id: user.id, username: user.username });

    res.status(201).json({ token, user });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr.code === "23505") {
      const field = pgErr.constraint?.includes("username")
        ? "username"
        : "email";
      res.status(409).json({ error: `${field} already taken` });
      return;
    }
    next(err);
  }
});

// ── POST /auth/login ──

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parsed.data;

    const result = await query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ id: user.id, username: user.username });
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// ── GET /auth/me ──

authRouter.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, username, email, display_name, preferred_color, avatar_url,
              rating, rating_deviation, games_played, wins, losses, draws,
              created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user!.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});
