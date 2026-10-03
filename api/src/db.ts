import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import pg, { type Pool, type PoolClient, type QueryResultRow } from "pg";

import { migrate } from "./migrate.js";
import type {
  Book,
  BookStatus,
  Category,
  Event,
  EventRegistration,
  EventStatus,
  PublicUser,
  Shelf,
  ShelfCategory,
  ShelfStatus,
  User,
  UserRole,
  UserStatus,
} from "./types.js";
import { SHELF_CATEGORIES, toPublicUser } from "./types.js";

const { Pool: PgPool } = pg;

export type Db = Pool;

function mapUser(row: QueryResultRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    passwordHash: row.password_hash,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapShelf(row: QueryResultRow): Shelf {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    goal: row.goal,
    category: row.category as ShelfCategory,
    mindShapingIntent: row.mind_shaping_intent,
    status: row.status as ShelfStatus,
    adminNote: row.admin_note ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapBook(row: QueryResultRow): Book {
  return {
    id: row.id,
    shelfId: row.shelf_id,
    title: row.title,
    author: row.author,
    notes: row.notes ?? null,
    status: row.status as BookStatus,
    borrowerId: row.borrower_id ?? null,
    borrowedAt: row.borrowed_at ? new Date(row.borrowed_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapEvent(row: QueryResultRow): Event {
  return {
    id: row.id,
    shelfId: row.shelf_id,
    title: row.title,
    description: row.description ?? "",
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    capacity: row.capacity == null ? null : Number(row.capacity),
    status: (row.status as EventStatus) ?? "accepted",
    proposedBy: row.proposed_by ?? null,
    adminNote: row.admin_note ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapCategory(row: QueryResultRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: Boolean(row.active),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createPool(connectionString: string): Pool {
  return new PgPool({ connectionString });
}

export async function initDb(pool: Pool): Promise<void> {
  await migrate(pool);
  await seedAdmin(pool);
  await seedCategories(pool);
}

export async function resetDb(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE event_registrations, events, books, shelves, categories, users RESTART IDENTITY CASCADE
  `);
  await seedAdmin(pool);
  await seedCategories(pool);
}

async function seedCategories(pool: Pool): Promise<void> {
  for (const name of SHELF_CATEGORIES) {
    await pool.query(
      `INSERT INTO categories (id, name, slug, active, created_at)
       VALUES ($1, $2, $3, TRUE, NOW())
       ON CONFLICT (name) DO NOTHING`,
      [randomUUID(), name, slugify(name)],
    );
  }
}

async function seedAdmin(pool: Pool): Promise<void> {
  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, ["admin@club.local"]);
  if (existing.rowCount && existing.rowCount > 0) return;

  const passwordHash = bcrypt.hashSync("password123", 10);
  await pool.query(
    `INSERT INTO users (id, email, name, role, status, password_hash, must_change_password, created_at)
     VALUES ($1, $2, $3, 'admin', 'approved', $4, FALSE, NOW())`,
    [randomUUID(), "admin@club.local", "Club Admin", passwordHash],
  );
}

export function generateTempPassword(): string {
  return randomBytes(4).toString("hex");
}

export async function createUser(
  pool: Pool,
  input: { email: string; name: string; password: string; role?: UserRole; status?: UserStatus },
): Promise<User> {
  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(input.password, 10);
  const role = input.role ?? "member";
  const status = input.status ?? "pending";
  const result = await pool.query(
    `INSERT INTO users (id, email, name, role, status, password_hash, must_change_password, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
     RETURNING *`,
    [id, input.email.toLowerCase(), input.name, role, status, passwordHash],
  );
  return mapUser(result.rows[0]);
}

export async function findUserByEmail(pool: Pool, email: string): Promise<User | null> {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserById(pool: Pool, id: string): Promise<User | null> {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function listMembers(pool: Pool, status?: UserStatus): Promise<PublicUser[]> {
  const result = status
    ? await pool.query(`SELECT * FROM users WHERE role = 'member' AND status = $1 ORDER BY created_at DESC`, [
        status,
      ])
    : await pool.query(`SELECT * FROM users WHERE role = 'member' ORDER BY created_at DESC`);
  return result.rows.map((row) => toPublicUser(mapUser(row)));
}

export async function setUserStatus(
  pool: Pool,
  id: string,
  status: UserStatus,
  opts?: { passwordHash?: string; mustChangePassword?: boolean },
): Promise<User | null> {
  const result = await pool.query(
    `UPDATE users
     SET status = $2,
         password_hash = COALESCE($3, password_hash),
         must_change_password = COALESCE($4, must_change_password)
     WHERE id = $1
     RETURNING *`,
    [id, status, opts?.passwordHash ?? null, opts?.mustChangePassword ?? null],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function updatePassword(
  pool: Pool,
  id: string,
  passwordHash: string,
  mustChangePassword: boolean,
): Promise<User | null> {
  const result = await pool.query(
    `UPDATE users SET password_hash = $2, must_change_password = $3 WHERE id = $1 RETURNING *`,
    [id, passwordHash, mustChangePassword],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function createShelf(
  pool: Pool,
  input: {
    ownerId: string;
    title: string;
    goal: string;
    category: ShelfCategory;
    mindShapingIntent: string;
    status?: ShelfStatus;
  },
): Promise<Shelf> {
  const id = randomUUID();
  const status = input.status ?? "proposed";
  const result = await pool.query(
    `INSERT INTO shelves (id, owner_id, title, goal, category, mind_shaping_intent, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [id, input.ownerId, input.title, input.goal, input.category, input.mindShapingIntent, status],
  );
  return mapShelf(result.rows[0]);
}

export async function listShelves(
  pool: Pool,
  filters?: { status?: ShelfStatus; category?: ShelfCategory; ownerId?: string },
): Promise<Shelf[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters?.status) {
    values.push(filters.status);
    clauses.push(`status = $${values.length}`);
  }
  if (filters?.category) {
    values.push(filters.category);
    clauses.push(`category = $${values.length}`);
  }
  if (filters?.ownerId) {
    values.push(filters.ownerId);
    clauses.push(`owner_id = $${values.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT * FROM shelves ${where} ORDER BY updated_at DESC`,
    values,
  );
  return result.rows.map(mapShelf);
}

export async function getShelf(pool: Pool, id: string): Promise<Shelf | null> {
  const result = await pool.query(`SELECT * FROM shelves WHERE id = $1`, [id]);
  return result.rows[0] ? mapShelf(result.rows[0]) : null;
}

export async function updateShelf(
  pool: Pool,
  id: string,
  patch: Partial<Pick<Shelf, "title" | "goal" | "category" | "mindShapingIntent" | "status" | "adminNote">>,
): Promise<Shelf | null> {
  const existing = await getShelf(pool, id);
  if (!existing) return null;
  const next = {
    title: patch.title ?? existing.title,
    goal: patch.goal ?? existing.goal,
    category: patch.category ?? existing.category,
    mindShapingIntent: patch.mindShapingIntent ?? existing.mindShapingIntent,
    status: patch.status ?? existing.status,
    adminNote: patch.adminNote !== undefined ? patch.adminNote : existing.adminNote,
  };
  const result = await pool.query(
    `UPDATE shelves
     SET title = $2, goal = $3, category = $4, mind_shaping_intent = $5,
         status = $6, admin_note = $7, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, next.title, next.goal, next.category, next.mindShapingIntent, next.status, next.adminNote],
  );
  return mapShelf(result.rows[0]);
}

export async function listBooks(pool: Pool, shelfId: string): Promise<Book[]> {
  const result = await pool.query(
    `SELECT * FROM books WHERE shelf_id = $1 ORDER BY created_at ASC`,
    [shelfId],
  );
  return result.rows.map(mapBook);
}

export async function getBook(pool: Pool, id: string): Promise<Book | null> {
  const result = await pool.query(`SELECT * FROM books WHERE id = $1`, [id]);
  return result.rows[0] ? mapBook(result.rows[0]) : null;
}

export async function createBook(
  pool: Pool,
  input: { shelfId: string; title: string; author: string; notes?: string | null },
): Promise<Book> {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO books (id, shelf_id, title, author, notes, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'available', NOW())
     RETURNING *`,
    [id, input.shelfId, input.title, input.author, input.notes ?? null],
  );
  await pool.query(`UPDATE shelves SET updated_at = NOW() WHERE id = $1`, [input.shelfId]);
  return mapBook(result.rows[0]);
}

export async function updateBook(
  pool: Pool,
  id: string,
  patch: Partial<Pick<Book, "title" | "author" | "notes" | "status" | "borrowerId" | "borrowedAt">>,
): Promise<Book | null> {
  const existing = await getBook(pool, id);
  if (!existing) return null;
  const next = {
    title: patch.title ?? existing.title,
    author: patch.author ?? existing.author,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    status: patch.status ?? existing.status,
    borrowerId: patch.borrowerId !== undefined ? patch.borrowerId : existing.borrowerId,
    borrowedAt: patch.borrowedAt !== undefined ? patch.borrowedAt : existing.borrowedAt,
  };
  const result = await pool.query(
    `UPDATE books
     SET title = $2, author = $3, notes = $4, status = $5, borrower_id = $6, borrowed_at = $7
     WHERE id = $1
     RETURNING *`,
    [id, next.title, next.author, next.notes, next.status, next.borrowerId, next.borrowedAt],
  );
  return mapBook(result.rows[0]);
}

export async function deleteBook(pool: Pool, id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM books WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function createEvent(
  pool: Pool,
  input: {
    shelfId: string;
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string | null;
    capacity?: number | null;
    status?: EventStatus;
    proposedBy?: string | null;
  },
): Promise<Event> {
  const id = randomUUID();
  const status = input.status ?? "proposed";
  const result = await pool.query(
    `INSERT INTO events (id, shelf_id, title, description, starts_at, ends_at, capacity, status, proposed_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`,
    [
      id,
      input.shelfId,
      input.title,
      input.description ?? "",
      input.startsAt,
      input.endsAt ?? null,
      input.capacity ?? null,
      status,
      input.proposedBy ?? null,
    ],
  );
  return mapEvent(result.rows[0]);
}

export async function listEvents(
  pool: Pool,
  filters?: { status?: EventStatus },
): Promise<Array<Event & { shelfTitle: string; registrationCount: number }>> {
  const status = filters?.status ?? "accepted";
  const result = await pool.query(
    `
    SELECT e.*, s.title AS shelf_title,
           (SELECT COUNT(*)::int FROM event_registrations r WHERE r.event_id = e.id) AS registration_count
    FROM events e
    JOIN shelves s ON s.id = e.shelf_id
    WHERE s.status = 'accepted' AND e.status = $1
    ORDER BY e.starts_at ASC
  `,
    [status],
  );
  return result.rows.map((row) => ({
    ...mapEvent(row),
    shelfTitle: row.shelf_title,
    registrationCount: Number(row.registration_count),
  }));
}

export async function updateEvent(
  pool: Pool,
  id: string,
  patch: Partial<Pick<Event, "status" | "adminNote" | "title" | "description" | "startsAt" | "endsAt" | "capacity">>,
): Promise<Event | null> {
  const existing = await getEvent(pool, id);
  if (!existing) return null;
  const next = {
    status: patch.status ?? existing.status,
    adminNote: patch.adminNote !== undefined ? patch.adminNote : existing.adminNote,
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    startsAt: patch.startsAt ?? existing.startsAt,
    endsAt: patch.endsAt !== undefined ? patch.endsAt : existing.endsAt,
    capacity: patch.capacity !== undefined ? patch.capacity : existing.capacity,
  };
  const result = await pool.query(
    `UPDATE events
     SET status = $2, admin_note = $3, title = $4, description = $5,
         starts_at = $6, ends_at = $7, capacity = $8
     WHERE id = $1
     RETURNING *`,
    [
      id,
      next.status,
      next.adminNote,
      next.title,
      next.description,
      next.startsAt,
      next.endsAt,
      next.capacity,
    ],
  );
  return mapEvent(result.rows[0]);
}

export async function listActiveCategoryNames(pool: Pool): Promise<string[]> {
  const result = await pool.query(`SELECT name FROM categories WHERE active = TRUE ORDER BY name ASC`);
  return result.rows.map((r) => r.name as string);
}

export async function listCategories(pool: Pool, activeOnly = false): Promise<Category[]> {
  const result = activeOnly
    ? await pool.query(`SELECT * FROM categories WHERE active = TRUE ORDER BY name ASC`)
    : await pool.query(`SELECT * FROM categories ORDER BY name ASC`);
  return result.rows.map(mapCategory);
}

export async function createCategory(pool: Pool, name: string): Promise<Category> {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO categories (id, name, slug, active, created_at)
     VALUES ($1, $2, $3, TRUE, NOW())
     RETURNING *`,
    [id, name.trim(), slugify(name.trim())],
  );
  return mapCategory(result.rows[0]);
}

export async function updateCategory(
  pool: Pool,
  id: string,
  patch: { name?: string; active?: boolean },
): Promise<Category | null> {
  const existing = await pool.query(`SELECT * FROM categories WHERE id = $1`, [id]);
  if (!existing.rows[0]) return null;
  const current = mapCategory(existing.rows[0]);
  const name = patch.name?.trim() ?? current.name;
  const active = patch.active ?? current.active;
  const result = await pool.query(
    `UPDATE categories SET name = $2, slug = $3, active = $4 WHERE id = $1 RETURNING *`,
    [id, name, slugify(name), active],
  );
  return mapCategory(result.rows[0]);
}

export async function deactivateCategory(pool: Pool, id: string): Promise<Category | null> {
  return updateCategory(pool, id, { active: false });
}

export async function isActiveCategory(pool: Pool, name: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM categories WHERE name = $1 AND active = TRUE`,
    [name],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getEvent(pool: Pool, id: string): Promise<Event | null> {
  const result = await pool.query(`SELECT * FROM events WHERE id = $1`, [id]);
  return result.rows[0] ? mapEvent(result.rows[0]) : null;
}

export async function registerForEvent(
  pool: Pool,
  eventId: string,
  userId: string,
): Promise<EventRegistration> {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO event_registrations (id, event_id, user_id, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [id, eventId, userId],
  );
  const row = result.rows[0];
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function canManageShelf(user: User, shelf: Shelf): boolean {
  return user.role === "admin" || shelf.ownerId === user.id;
}

export function isApprovedMember(user: User): boolean {
  return user.status === "approved" && !user.mustChangePassword;
}

export async function withClient<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
