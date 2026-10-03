"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminBorrowBook,
  createBook,
  deleteBook,
  getShelf,
  getStoredUser,
  listMembers,
  type PublicUser,
  type ShelfDetail,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import { BooksTableView } from "./_components/books-table-view";

export default function ShelfDetailPage() {
  const params = useParams<{ id: string }>();
  const [shelf, setShelf] = useState<ShelfDetail | null>(null);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const user = getStoredUser();
      const admin = user?.role === "admin";
      setIsAdmin(Boolean(admin));
      setUserId(user?.id ?? null);
      const data = await getShelf(params.id);
      setShelf(data);
      if (admin) {
        setMembers(await listMembers("approved"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load shelf");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRemove = useCallback(
    (id: string) => {
      void deleteBook(id)
        .then(() => load())
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  const onBorrow = useCallback(
    (bookId: string, borrowerId: string) => {
      void adminBorrowBook(bookId, { status: "borrowed", borrowerId })
        .then(() => {
          toast.success("Marked borrowed (offline handoff)");
          return load();
        })
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  const onReturn = useCallback(
    (bookId: string) => {
      void adminBorrowBook(bookId, { status: "available", borrowerId: null })
        .then(() => {
          toast.success("Marked available");
          return load();
        })
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  const onAddBook = useCallback(
    async (values: { title: string; author: string; notes: string | null }) => {
      if (!shelf) return;
      try {
        await createBook(shelf.id, values);
        toast.success("Book added");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add book");
        throw err;
      }
    },
    [shelf, load],
  );

  if (loading) return <p className="p-6 text-muted-foreground text-sm">Loading…</p>;
  if (!shelf) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm">Shelf not found.</p>
        <Button asChild variant="outline">
          <Link prefetch={false} href="/dashboard/shelves">
            Back
          </Link>
        </Button>
      </div>
    );
  }

  const canEditBooks = shelf.status === "accepted" && (isAdmin || userId === shelf.ownerId);
  const canEditShelf = isAdmin || userId === shelf.ownerId;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {shelf.category}
            </Badge>
            <Badge
              className={cn(
                "capitalize",
                shelf.status === "accepted" && "border-emerald-500/30 bg-emerald-500/10",
                shelf.status === "proposed" && "border-amber-500/30 bg-amber-500/10",
                shelf.status === "rejected" && "border-destructive/30 bg-destructive/10",
              )}
              variant="outline"
            >
              {shelf.status}
            </Badge>
          </div>
          <h1 className="font-semibold text-2xl tracking-tight">{shelf.title}</h1>
          <p className="text-sm">
            <span className="text-muted-foreground">Goal:</span> {shelf.goal}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Mind-shaping:</span> {shelf.mindShapingIntent}
          </p>
        </div>
        <div className="flex gap-2">
          {canEditShelf ? (
            <Button asChild variant="outline" size="sm">
              <Link prefetch={false} href={`/dashboard/shelves/${shelf.id}/edit`}>
                Edit shelf
              </Link>
            </Button>
          ) : null}
          {isAdmin ? (
            <Button asChild variant="ghost" size="sm">
              <Link prefetch={false} href="/dashboard/shelves">
                Back
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {shelf.status === "accepted" ? (
        <BooksTableView
          books={shelf.books}
          isAdmin={isAdmin}
          canEditBooks={canEditBooks}
          members={members}
          onRemove={onRemove}
          onBorrow={onBorrow}
          onReturn={onReturn}
          onAddBook={onAddBook}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Awaiting acceptance</CardTitle>
            <CardDescription>Books can be added after an admin accepts this shelf.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
