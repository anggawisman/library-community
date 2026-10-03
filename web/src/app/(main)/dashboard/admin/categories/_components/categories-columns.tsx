"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/api";
import { cn } from "@/lib/utils";

export type CategoryActions = {
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
};

export function createCategoriesColumns(actions: CategoryActions): ColumnDef<Category>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.slug}`.toLowerCase(),
      header: () => null,
      cell: () => null,
      enableHiding: true,
      filterFn: (row, _id, value: string) => {
        if (!value) return true;
        const q = value.toLowerCase();
        return row.original.name.toLowerCase().includes(q) || row.original.slug.toLowerCase().includes(q);
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.slug}</span>,
    },
    {
      accessorKey: "active",
      header: "Status",
      filterFn: (row, _id, value: string) => {
        if (!value || value === "All") return true;
        if (value === "Active") return row.original.active;
        if (value === "Inactive") return !row.original.active;
        return true;
      },
      cell: ({ row }) => (
        <Badge
          className={cn(
            "gap-1.5 border px-2 py-1 font-medium",
            row.original.active
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-muted-foreground/30 bg-muted text-muted-foreground",
          )}
          variant="outline"
        >
          <span className={cn("size-1.5 rounded-full", row.original.active ? "bg-emerald-500" : "bg-muted-foreground")} />
          {row.original.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        row.original.active ? (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => actions.onDeactivate(row.original.id)}>
              Deactivate
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => actions.onReactivate(row.original.id)}>
              Reactivate
            </Button>
          </div>
        ),
    },
  ];
}
