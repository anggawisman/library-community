export type UserRole = "admin" | "member";
export type UserStatus = "pending" | "approved" | "rejected";
export type ShelfStatus = "proposed" | "accepted" | "rejected";
export type BookStatus = "available" | "borrowed";
export type EventStatus = "proposed" | "accepted" | "rejected";

/** @deprecated Use categories from DB; kept for seed reference only */
export const SHELF_CATEGORIES = [
  "Leadership",
  "Habit",
  "Philosophy",
  "Fiction",
  "Career",
  "Wellness",
  "Other",
] as const;

export type ShelfCategory = string;

export interface Category {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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

export interface Event {
  id: string;
  shelfId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  status: EventStatus;
  proposedBy: string | null;
  adminNote: string | null;
  createdAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function ok<T>(data: T): ApiEnvelope<T> {
  return { success: true, data, error: null };
}

export function fail(error: string): ApiEnvelope<null> {
  return { success: false, data: null, error };
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
  };
}
