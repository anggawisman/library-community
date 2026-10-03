import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import type { Db } from "./db.js";
import { findUserById } from "./db.js";
import type { Mailer } from "./mailer.js";
import type { User } from "./types.js";
import { fail } from "./types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-community-shelves-secret";

export interface AuthRequest extends Request {
  user?: User;
  db: Db;
  mailer: Mailer;
}

export function signToken(user: User): string {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json(fail("Unauthorized"));
    return;
  }

  try {
    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await findUserById(req.db, payload.sub);
    if (!user) {
      res.status(401).json(fail("Unauthorized"));
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json(fail("Unauthorized"));
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json(fail("Admin only"));
    return;
  }
  next();
}

export function requireApproved(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json(fail("Unauthorized"));
    return;
  }
  if (req.user.status !== "approved") {
    res.status(403).json(fail("Account awaiting admin approval"));
    return;
  }
  if (req.user.mustChangePassword) {
    res.status(403).json(fail("Password change required"));
    return;
  }
  next();
}
