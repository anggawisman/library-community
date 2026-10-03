const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ShelfCategory = string;

export type UserStatus = "pending" | "approved" | "rejected";
export type ShelfStatus = "proposed" | "accepted" | "rejected";
export type BookStatus = "available" | "borrowed";
export type EventStatus = "proposed" | "accepted" | "rejected";

export interface Category {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  status: UserStatus;
  mustChangePassword: boolean;
}

export interface Shelf {
  id: string;
  ownerId: string;
  title: string;
  goal: string;
  category: ShelfCategory;
  mindShapingIntent: string;
  status: ShelfStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  shelfId: string;
  title: string;
  author: string;
  notes: string | null;
  status: BookStatus;
  borrowerId: string | null;
  borrowedAt: string | null;
  createdAt: string;
}

export interface ShelfDetail extends Shelf {
  books: Book[];
}

export interface EventItem {
  id: string;
  shelfId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  status?: EventStatus;
  proposedBy?: string | null;
  adminNote?: string | null;
  createdAt: string;
  shelfTitle: string;
  registrationCount: number;
}

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("cms_token");
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("cms_token", token);
  else window.localStorage.removeItem("cms_token");
}

export function setStoredUser(user: PublicUser | null): void {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem("cms_user", JSON.stringify(user));
  else window.localStorage.removeItem("cms_user");
}

export function getStoredUser(): PublicUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("cms_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  setToken(null);
  setStoredUser(null);
}

async function api<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = (await res.json()) as Envelope<T>;
  if (!res.ok || !body.success || body.data === null) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body.data;
}

export function register(email: string, name: string, password: string) {
  return api<PublicUser>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify({ email, name, password }) },
    false,
  );
}

export function login(email: string, password: string) {
  return api<{ token: string; user: PublicUser }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
}

export function changePassword(currentPassword: string, newPassword: string) {
  return api<PublicUser>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function me() {
  return api<PublicUser>("/api/auth/me");
}

export function listCategories() {
  return api<Category[]>("/api/categories", undefined, false);
}

export function listAdminCategories() {
  return api<Category[]>("/api/admin/categories");
}

export function createCategory(name: string) {
  return api<Category>("/api/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateCategory(id: string, patch: { name?: string; active?: boolean }) {
  return api<Category>(`/api/admin/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deactivateCategory(id: string) {
  return api<Category>(`/api/admin/categories/${id}`, { method: "DELETE" });
}

export function listPublicShelves(category?: ShelfCategory) {
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  return api<Shelf[]>(`/api/shelves${q}`, undefined, false);
}

export function listMyShelves() {
  return api<Shelf[]>("/api/shelves?mine=1");
}

export function listProposals() {
  return api<Shelf[]>("/api/admin/proposals");
}

export function getShelf(id: string) {
  return api<ShelfDetail>(`/api/shelves/${id}`);
}

export function proposeShelf(input: {
  title: string;
  goal: string;
  category: ShelfCategory;
  mindShapingIntent: string;
}) {
  return api<Shelf>("/api/shelves", { method: "POST", body: JSON.stringify(input) });
}

export function reviewShelf(
  id: string,
  input: { status?: "accepted" | "rejected"; category?: ShelfCategory; adminNote?: string | null },
) {
  return api<Shelf>(`/api/shelves/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function updateShelf(
  id: string,
  input: Partial<{
    title: string;
    goal: string;
    category: ShelfCategory;
    mindShapingIntent: string;
  }>,
) {
  return api<Shelf>(`/api/shelves/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function createBook(
  shelfId: string,
  input: { title: string; author: string; notes?: string | null },
) {
  return api<Book>(`/api/shelves/${shelfId}/books`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteBook(id: string) {
  return api<{ id: string }>(`/api/books/${id}`, { method: "DELETE" });
}

export function adminBorrowBook(
  id: string,
  input: { status: BookStatus; borrowerId?: string | null },
) {
  return api<Book>(`/api/books/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function listMembers(status?: UserStatus) {
  const q = status ? `?status=${status}` : "";
  return api<PublicUser[]>(`/api/admin/members${q}`);
}

export function setMemberStatus(id: string, status: "approved" | "rejected") {
  return api<PublicUser>(`/api/admin/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listEvents() {
  return api<EventItem[]>("/api/events", undefined, false);
}

export function listEventProposals() {
  return api<EventItem[]>("/api/admin/event-proposals");
}

export function createEvent(input: {
  shelfId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
}) {
  return api<EventItem>("/api/events", { method: "POST", body: JSON.stringify(input) });
}

export function reviewEvent(id: string, input: { status: "accepted" | "rejected"; adminNote?: string | null }) {
  return api<EventItem>(`/api/events/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function registerForEvent(id: string) {
  return api<{ id: string }>(`/api/events/${id}/register`, { method: "POST" });
}
