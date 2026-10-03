import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";

import type { AuthRequest } from "./auth.js";
import { requireAdmin, requireApproved, requireAuth, signToken } from "./auth.js";
import {
  canManageShelf,
  createBook,
  createCategory,
  createEvent,
  createShelf,
  createUser,
  deactivateCategory,
  deleteBook,
  findUserByEmail,
  generateTempPassword,
  getBook,
  getEvent,
  getShelf,
  isActiveCategory,
  listBooks,
  listCategories,
  listEvents,
  listMembers,
  listShelves,
  registerForEvent,
  setUserStatus,
  updateBook,
  updateCategory,
  updateEvent,
  updatePassword,
  updateShelf,
} from "./db.js";
import { fail, ok, toPublicUser } from "./types.js";

const shelfBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  goal: z.string().trim().min(1).max(1000),
  category: z.string().trim().min(1).max(100),
  mindShapingIntent: z.string().trim().min(1).max(2000),
});

const bookBodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const eventBodySchema = z.object({
  shelfId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
});

export function createRouter(): Router {
  const router = Router();

  router.post("/auth/register", async (req: AuthRequest, res) => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().trim().min(1).max(120),
      password: z.string().min(6).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid registration payload"));
      return;
    }

    const existing = await findUserByEmail(req.db, parsed.data.email);
    if (existing) {
      res.status(409).json(fail("Email already registered"));
      return;
    }

    const user = await createUser(req.db, {
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      status: "pending",
    });
    res.status(201).json(ok(toPublicUser(user)));
  });

  router.post("/auth/login", async (req: AuthRequest, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid login payload"));
      return;
    }

    const user = await findUserByEmail(req.db, parsed.data.email);
    if (!user || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
      res.status(401).json(fail("Invalid email or password"));
      return;
    }
    if (user.status === "pending") {
      res.status(403).json(fail("Account awaiting admin approval"));
      return;
    }
    if (user.status === "rejected") {
      res.status(403).json(fail("Account was rejected"));
      return;
    }

    res.json(
      ok({
        token: signToken(user),
        user: toPublicUser(user),
      }),
    );
  });

  router.get("/auth/me", requireAuth, (req: AuthRequest, res) => {
    res.json(ok(toPublicUser(req.user!)));
  });

  router.post("/auth/change-password", requireAuth, async (req: AuthRequest, res) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid password payload"));
      return;
    }

    const user = req.user!;
    if (!bcrypt.compareSync(parsed.data.currentPassword, user.passwordHash)) {
      res.status(401).json(fail("Current password is incorrect"));
      return;
    }

    const updated = await updatePassword(
      req.db,
      user.id,
      bcrypt.hashSync(parsed.data.newPassword, 10),
      false,
    );
    res.json(ok(toPublicUser(updated!)));
  });

  router.get("/admin/members", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const members = await listMembers(
      req.db,
      status === "pending" || status === "approved" || status === "rejected" ? status : undefined,
    );
    res.json(ok(members));
  });

  router.patch("/admin/members/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const schema = z.object({
      status: z.enum(["approved", "rejected"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid member status"));
      return;
    }

    const memberId = req.params.id as string;
    if (parsed.data.status === "approved") {
      const tempPassword = generateTempPassword();
      const passwordHash = bcrypt.hashSync(tempPassword, 10);
      const updated = await setUserStatus(req.db, memberId, "approved", {
        passwordHash,
        mustChangePassword: true,
      });
      if (!updated) {
        res.status(404).json(fail("Member not found"));
        return;
      }
      await req.mailer.send(
        updated.email,
        "Your Community Shelves account was approved",
        `Hello ${updated.name},\n\nYour account was approved.\nTemporary password: ${tempPassword}\n\nPlease sign in and change your password.\n`,
      );
      res.json(ok(toPublicUser(updated)));
      return;
    }

    const updated = await setUserStatus(req.db, memberId, "rejected", {
      mustChangePassword: false,
    });
    if (!updated) {
      res.status(404).json(fail("Member not found"));
      return;
    }
    res.json(ok(toPublicUser(updated)));
  });

  router.get("/shelves", async (req: AuthRequest, res, next) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const mine = req.query.mine === "1";

    if (mine) {
      try {
        await requireAuth(req, res, async () => {
          const shelves = await listShelves(req.db, { ownerId: req.user!.id });
          res.json(ok(shelves));
        });
      } catch (err) {
        next(err);
      }
      return;
    }

    const shelves = await listShelves(req.db, { status: "accepted", category });
    res.json(ok(shelves));
  });

  router.get("/admin/proposals", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const shelves = await listShelves(req.db, { status: "proposed" });
    res.json(ok(shelves));
  });

  router.post("/shelves", requireAuth, requireApproved, async (req: AuthRequest, res) => {
    const parsed = shelfBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid shelf payload"));
      return;
    }
    if (!(await isActiveCategory(req.db, parsed.data.category))) {
      res.status(400).json(fail("Unknown or inactive category"));
      return;
    }
    const existing = await listShelves(req.db, { ownerId: req.user!.id });
    if (existing.length > 0) {
      res.status(409).json(fail("Members may only have one shelf"));
      return;
    }
    const shelf = await createShelf(req.db, {
      ownerId: req.user!.id,
      ...parsed.data,
      status: "proposed",
    });
    res.status(201).json(ok(shelf));
  });

  router.get("/shelves/:id", async (req: AuthRequest, res, next) => {
    const shelf = await getShelf(req.db, req.params.id as string);
    if (!shelf) {
      res.status(404).json(fail("Shelf not found"));
      return;
    }
    if (shelf.status !== "accepted") {
      if (!req.headers.authorization) {
        res.status(404).json(fail("Shelf not found"));
        return;
      }
      try {
        await requireAuth(req, res, async () => {
          if (req.user!.role !== "admin" && req.user!.id !== shelf.ownerId) {
            res.status(404).json(fail("Shelf not found"));
            return;
          }
          res.json(ok({ ...shelf, books: [] }));
        });
      } catch (err) {
        next(err);
      }
      return;
    }
    const books = await listBooks(req.db, shelf.id);
    res.json(ok({ ...shelf, books }));
  });

  router.patch("/shelves/:id", requireAuth, async (req: AuthRequest, res) => {
    const shelf = await getShelf(req.db, req.params.id as string);
    if (!shelf) {
      res.status(404).json(fail("Shelf not found"));
      return;
    }

    const isAdmin = req.user!.role === "admin";
    if (!isAdmin && !canManageShelf(req.user!, shelf)) {
      res.status(403).json(fail("Forbidden"));
      return;
    }

    if (isAdmin && shelf.status === "proposed") {
      const schema = z.object({
        status: z.enum(["accepted", "rejected"]).optional(),
        category: z.string().trim().min(1).max(100).optional(),
        adminNote: z.string().trim().max(2000).nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(fail("Invalid proposal payload"));
        return;
      }
      if (parsed.data.category && !(await isActiveCategory(req.db, parsed.data.category))) {
        res.status(400).json(fail("Unknown or inactive category"));
        return;
      }
      const updated = await updateShelf(req.db, shelf.id, parsed.data);
      res.json(ok(updated));
      return;
    }

    if (shelf.status !== "accepted" && !isAdmin) {
      res.status(403).json(fail("Only accepted shelves can be edited"));
      return;
    }

    const parsed = shelfBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid shelf payload"));
      return;
    }
    const updated = await updateShelf(req.db, shelf.id, parsed.data);
    res.json(ok(updated));
  });

  router.post("/shelves/:id/books", requireAuth, requireApproved, async (req: AuthRequest, res) => {
    const shelf = await getShelf(req.db, req.params.id as string);
    if (!shelf) {
      res.status(404).json(fail("Shelf not found"));
      return;
    }
    if (shelf.status !== "accepted") {
      res.status(403).json(fail("Books can only be added to accepted shelves"));
      return;
    }
    if (!canManageShelf(req.user!, shelf)) {
      res.status(403).json(fail("Forbidden"));
      return;
    }
    const parsed = bookBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid book payload"));
      return;
    }
    const book = await createBook(req.db, {
      shelfId: shelf.id,
      title: parsed.data.title,
      author: parsed.data.author,
      notes: parsed.data.notes ?? null,
    });
    res.status(201).json(ok(book));
  });

  router.patch("/books/:id", requireAuth, async (req: AuthRequest, res) => {
    const book = await getBook(req.db, req.params.id as string);
    if (!book) {
      res.status(404).json(fail("Book not found"));
      return;
    }
    const shelf = await getShelf(req.db, book.shelfId);
    if (!shelf) {
      res.status(404).json(fail("Shelf not found"));
      return;
    }

    const isAdmin = req.user!.role === "admin";
    if (isAdmin) {
      const borrowSchema = z.object({
        status: z.enum(["available", "borrowed"]).optional(),
        borrowerId: z.string().uuid().nullable().optional(),
        title: z.string().trim().min(1).max(300).optional(),
        author: z.string().trim().min(1).max(200).optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
      });
      const parsed = borrowSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(fail("Invalid book payload"));
        return;
      }
      const patch: Parameters<typeof updateBook>[2] = { ...parsed.data };
      if (parsed.data.status === "borrowed") {
        patch.borrowedAt = new Date().toISOString();
        if (!parsed.data.borrowerId) {
          res.status(400).json(fail("borrowerId required when marking borrowed"));
          return;
        }
      }
      if (parsed.data.status === "available") {
        patch.borrowerId = null;
        patch.borrowedAt = null;
      }
      const updated = await updateBook(req.db, book.id, patch);
      res.json(ok(updated));
      return;
    }

    if (!canManageShelf(req.user!, shelf) || shelf.status !== "accepted") {
      res.status(403).json(fail("Forbidden"));
      return;
    }
    const parsed = bookBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid book payload"));
      return;
    }
    const updated = await updateBook(req.db, book.id, parsed.data);
    res.json(ok(updated));
  });

  router.delete("/books/:id", requireAuth, requireApproved, async (req: AuthRequest, res) => {
    const book = await getBook(req.db, req.params.id as string);
    if (!book) {
      res.status(404).json(fail("Book not found"));
      return;
    }
    const shelf = await getShelf(req.db, book.shelfId);
    if (!shelf || !canManageShelf(req.user!, shelf)) {
      res.status(403).json(fail("Forbidden"));
      return;
    }
    await deleteBook(req.db, book.id);
    res.json(ok({ id: book.id }));
  });

  router.get("/categories", async (req: AuthRequest, res) => {
    const categories = await listCategories(req.db, true);
    res.json(ok(categories));
  });

  router.get("/admin/categories", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const categories = await listCategories(req.db, false);
    res.json(ok(categories));
  });

  router.post("/admin/categories", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const schema = z.object({ name: z.string().trim().min(1).max(100) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid category payload"));
      return;
    }
    try {
      const category = await createCategory(req.db, parsed.data.name);
      res.status(201).json(ok(category));
    } catch {
      res.status(409).json(fail("Category already exists"));
    }
  });

  router.patch("/admin/categories/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const schema = z.object({
      name: z.string().trim().min(1).max(100).optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid category payload"));
      return;
    }
    try {
      const updated = await updateCategory(req.db, req.params.id as string, parsed.data);
      if (!updated) {
        res.status(404).json(fail("Category not found"));
        return;
      }
      res.json(ok(updated));
    } catch {
      res.status(409).json(fail("Category name conflict"));
    }
  });

  router.delete("/admin/categories/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const updated = await deactivateCategory(req.db, req.params.id as string);
    if (!updated) {
      res.status(404).json(fail("Category not found"));
      return;
    }
    res.json(ok(updated));
  });

  router.get("/events", async (req: AuthRequest, res) => {
    const events = await listEvents(req.db, { status: "accepted" });
    res.json(ok(events));
  });

  router.get("/admin/event-proposals", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const events = await listEvents(req.db, { status: "proposed" });
    res.json(ok(events));
  });

  router.post("/events", requireAuth, requireApproved, async (req: AuthRequest, res) => {
    const parsed = eventBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid event payload"));
      return;
    }
    const shelf = await getShelf(req.db, parsed.data.shelfId);
    if (!shelf || shelf.status !== "accepted") {
      res.status(400).json(fail("Events require an accepted shelf"));
      return;
    }
    const isAdmin = req.user!.role === "admin";
    if (!isAdmin && shelf.ownerId !== req.user!.id) {
      res.status(403).json(fail("You can only propose events on your own shelves"));
      return;
    }
    const event = await createEvent(req.db, {
      ...parsed.data,
      status: isAdmin ? "accepted" : "proposed",
      proposedBy: req.user!.id,
    });
    res.status(201).json(ok(event));
  });

  router.patch("/events/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const schema = z.object({
      status: z.enum(["accepted", "rejected"]).optional(),
      adminNote: z.string().trim().max(2000).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(fail("Invalid event review payload"));
      return;
    }
    const updated = await updateEvent(req.db, req.params.id as string, parsed.data);
    if (!updated) {
      res.status(404).json(fail("Event not found"));
      return;
    }
    res.json(ok(updated));
  });

  router.post("/events/:id/register", requireAuth, requireApproved, async (req: AuthRequest, res) => {
    const event = await getEvent(req.db, req.params.id as string);
    if (!event || event.status !== "accepted") {
      res.status(404).json(fail("Event not found"));
      return;
    }
    const shelf = await getShelf(req.db, event.shelfId);
    if (!shelf || shelf.status !== "accepted") {
      res.status(400).json(fail("Event is not available"));
      return;
    }
    try {
      const registration = await registerForEvent(req.db, event.id, req.user!.id);
      res.status(201).json(ok(registration));
    } catch {
      res.status(409).json(fail("Already registered"));
    }
  });

  return router;
}
