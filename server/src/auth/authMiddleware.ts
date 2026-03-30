import type { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

// ── Augment Express Request ──

export interface AuthPayload {
  id: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ── Express middleware ──

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed authorization header" });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Socket.IO middleware ──

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}
