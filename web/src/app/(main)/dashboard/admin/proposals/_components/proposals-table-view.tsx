"use client";
"use no memo";

import * as React from "react";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin-table/admin-data-table";
import { AdminTableCard } from "@/components/admin-table/admin-table-card";
import type { Category, Shelf, ShelfCategory } from "@/lib/api";

import { createProposalsColumns } from "./proposals-columns";

export function ProposalsTableView({
  proposals,
  categoryOptions,
  categoryById,
  loading,
  onCategoryChange,
  onAccept,
  onReject,
}: {
  proposals: Shelf[];
  categoryOptions: Category[];
  categoryById: Record<string, ShelfCategory>;
  loading: boolean;
  onCategoryChange: (id: string, category: ShelfCategory) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const columns = React.useMemo(
    () =>
      createProposalsColumns({
        categoryById,
        categoryOptions,
        onCategoryChange,
        onAccept,
        onReject,
      }),
    [categoryById, categoryOptions, onCategoryChange, onAccept, onReject],
  );
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "title", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data: proposals,
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

  return (
    <AdminTableCard
      title="Shelf proposals"
      description="Review goal and mind-shaping intent. You may change category before accepting."
      searchPlaceholder="Search proposals…"
      searchValue={searchQuery}
      onSearchChange={(value) => {
        table.getColumn("search")?.setFilterValue(value || undefined);
        table.setPageIndex(0);
      }}
    >
      {loading ? (
        <p className="px-4 text-muted-foreground text-sm">Loading…</p>
      ) : (
        <AdminDataTable table={table} />
      )}
    </AdminTableCard>
  );
}
