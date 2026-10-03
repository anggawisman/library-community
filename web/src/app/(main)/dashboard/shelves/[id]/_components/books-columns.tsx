"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Book, PublicUser } from "@/lib/api";
import { cn } from "@/lib/utils";

export type BooksTableActions = {
  isAdmin: boolean;
  canRemove: boolean;
  members: PublicUser[];
  onRemove: (id: string) => void;
  onBorrow: (bookId: string, borrowerId: string) => void;
  onReturn: (bookId: string) => void;
};

export function createBooksColumns(actions: BooksTableActions): ColumnDef<Book>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.title} ${row.author}`.toLowerCase(),
      header: () => null,
      cell: () => null,
      enableHiding: true,
      filterFn: (row, _id, value: string) => {
        if (!value) return true;
        const q = value.toLowerCase();
        return row.original.title.toLowerCase().includes(q) || row.original.author.toLowerCase().includes(q);
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="grid gap-0.5">
          <span className="font-medium">{row.original.title}</span>
          {row.original.notes ? (
            <span className="max-w-xs truncate text-muted-foreground text-xs">{row.original.notes}</span>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "author",
      header: "Author",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.author}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "gap-1.5 border px-2 py-1 font-medium capitalize",
            row.original.status === "available"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}
          variant="outline"
        >
          {row.original.status}
          {row.original.borrowedAt ? ` · ${new Date(row.original.borrowedAt).toLocaleDateString()}` : ""}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const book = row.original;
        return (
          <div className="flex flex-wrap justify-end gap-2">
            {actions.canRemove && !actions.isAdmin ? (
              <Button size="sm" variant="ghost" onClick={() => actions.onRemove(book.id)}>
                Remove
              </Button>
            ) : null}
            {actions.isAdmin && book.status === "available" ? (
              <select
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) actions.onBorrow(book.id, e.target.value);
                }}
              >
                <option value="">Mark borrowed…</option>
                {actions.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : null}
            {actions.isAdmin && book.status === "borrowed" ? (
              <Button size="sm" variant="outline" onClick={() => actions.onReturn(book.id)}>
                Return
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];
}
