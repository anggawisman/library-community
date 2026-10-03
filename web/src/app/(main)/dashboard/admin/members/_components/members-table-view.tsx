"use client";
"use no memo";

import * as React from "react";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin-table/admin-data-table";
import { AdminTableCard } from "@/components/admin-table/admin-table-card";
import type { PublicUser } from "@/lib/api";

import { createMembersColumns } from "./members-columns";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected"];

export function MembersTableView({
  members,
  loading,
  onApprove,
  onReject,
}: {
  members: PublicUser[];
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const columns = React.useMemo(
    () => createMembersColumns({ onApprove, onReject }),
    [onApprove, onReject],
  );
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data: members,
    columns,
    state: { sorting, columnFilters, columnVisibility, pagination },
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string) ?? "";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) ?? "All";

  return (
    <AdminTableCard
      title="Members"
      description="Approve registrations so members can propose shelves and join events."
      searchPlaceholder="Search members…"
      searchValue={searchQuery}
      onSearchChange={(value) => {
        table.getColumn("search")?.setFilterValue(value || undefined);
        table.setPageIndex(0);
      }}
      filters={[
        {
          id: "status",
          label: "Status",
          value: statusFilter,
          options: STATUS_OPTIONS,
          onChange: (value) => {
            table.getColumn("status")?.setFilterValue(value === "All" ? undefined : value);
            table.setPageIndex(0);
          },
        },
      ]}
    >
      {loading ? (
        <p className="px-4 text-muted-foreground text-sm">Loading…</p>
      ) : (
        <AdminDataTable table={table} />
      )}
    </AdminTableCard>
  );
}
