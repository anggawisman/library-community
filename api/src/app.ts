import cors from "cors";
import express, { type Express } from "express";

import type { AuthRequest } from "./auth.js";
import { createPool, initDb, type Db } from "./db.js";
import { ConsoleMailer, type Mailer } from "./mailer.js";
import { createRouter } from "./routes.js";

export async function createApp(db: Db, mailer: Mailer = new ConsoleMailer()): Promise<Express> {
  await initDb(db);
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as AuthRequest).db = db;
    (req as AuthRequest).mailer = mailer;
    next();
  });
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api", createRouter());
  return app;
}

export async function createAppFromUrl(connectionString: string, mailer?: Mailer): Promise<Express> {
  const pool = createPool(connectionString);
  return createApp(pool, mailer);
}
