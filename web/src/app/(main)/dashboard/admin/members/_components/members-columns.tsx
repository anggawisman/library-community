"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicUser, UserStatus } from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";

const statusMeta: Record<UserStatus, { badgeClass: string; dotClass: string }> = {
  pending: {
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  approved: {
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  rejected: {
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
};

export type MemberActions = {
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
};

export function createMembersColumns(actions: MemberActions): ColumnDef<PublicUser>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.email}`.toLowerCase(),
      header: () => null,
      cell: () => null,
      enableHiding: true,
      filterFn: (row, _id, value: string) => {
        if (!value) return true;
        const q = value.toLowerCase();
        return row.original.name.toLowerCase().includes(q) || row.original.email.toLowerCase().includes(q);
      },
    },
    {
      accessorKey: "name",
      header: "Member",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5">
            <span className="font-medium whitespace-nowrap">{row.original.name}</span>
            {row.original.mustChangePassword ? (
              <span className="text-muted-foreground text-xs">Must change temp password</span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <span className="capitalize">{row.original.role}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: (row, _id, value: string) => {
        if (!value || value === "All") return true;
        return row.original.status === value.toLowerCase();
      },
      cell: ({ row }) => {
        const status = row.original.status;
        const meta = statusMeta[status];
        return (
          <Badge className={cn("gap-1.5 border px-2 py-1 font-medium capitalize", meta.badgeClass)} variant="outline">
            <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        if (row.original.status !== "pending") return null;
        return (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => actions.onApprove(row.original.id)}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => actions.onReject(row.original.id)}>
              Reject
            </Button>
          </div>
        );
      },
    },
  ];
}
