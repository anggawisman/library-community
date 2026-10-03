"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import type { Category, Shelf, ShelfCategory } from "@/lib/api";

export type ProposalActions = {
  categoryById: Record<string, ShelfCategory>;
  categoryOptions: Category[];
  onCategoryChange: (id: string, category: ShelfCategory) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
};

export function createProposalsColumns(actions: ProposalActions): ColumnDef<Shelf>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.title} ${row.goal} ${row.mindShapingIntent}`.toLowerCase(),
      header: () => null,
      cell: () => null,
      enableHiding: true,
      filterFn: (row, _id, value: string) => {
        if (!value) return true;
        const q = value.toLowerCase();
        const s = row.original;
        return (
          s.title.toLowerCase().includes(q) ||
          s.goal.toLowerCase().includes(q) ||
          s.mindShapingIntent.toLowerCase().includes(q)
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="grid max-w-xs gap-0.5">
          <span className="font-medium">{row.original.title}</span>
          <span className="text-muted-foreground text-xs">Owner {row.original.ownerId.slice(0, 8)}…</span>
        </div>
      ),
    },
    {
      accessorKey: "goal",
      header: "Goal",
      cell: ({ row }) => <p className="max-w-sm truncate text-muted-foreground">{row.original.goal}</p>,
    },
    {
      accessorKey: "mindShapingIntent",
      header: "Mind-shaping",
      cell: ({ row }) => (
        <p className="max-w-sm truncate text-muted-foreground">{row.original.mindShapingIntent}</p>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        const id = row.original.id;
        const current = actions.categoryById[id] ?? row.original.category;
        const options = actions.categoryOptions.some((c) => c.name === current)
          ? actions.categoryOptions
          : [
              { id: `current-${id}`, name: current, slug: "", active: true, createdAt: "" },
              ...actions.categoryOptions,
            ];
        return (
          <select
            className="h-9 max-w-[10rem] rounded-md border border-input bg-transparent px-2 text-sm"
            value={current}
            onChange={(e) => actions.onCategoryChange(id, e.target.value as ShelfCategory)}
          >
            {options.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => actions.onAccept(row.original.id)}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => actions.onReject(row.original.id)}>
            Reject
          </Button>
        </div>
      ),
    },
  ];
}
