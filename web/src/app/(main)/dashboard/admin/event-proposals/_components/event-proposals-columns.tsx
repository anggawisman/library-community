"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import type { EventItem } from "@/lib/api";

export type EventProposalActions = {
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
};

export function createEventProposalsColumns(actions: EventProposalActions): ColumnDef<EventItem>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.title} ${row.shelfTitle} ${row.description}`.toLowerCase(),
      header: () => null,
      cell: () => null,
      enableHiding: true,
      filterFn: (row, _id, value: string) => {
        if (!value) return true;
        const q = value.toLowerCase();
        const e = row.original;
        return (
          e.title.toLowerCase().includes(q) ||
          e.shelfTitle.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: "shelfTitle",
      header: "Shelf",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.shelfTitle}</span>,
    },
    {
      accessorKey: "startsAt",
      header: "Starts",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {format(parseISO(row.original.startsAt), "PPp")}
        </span>
      ),
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
