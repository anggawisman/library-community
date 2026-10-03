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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/api";

import { createCategoriesColumns } from "./categories-columns";

const STATUS_OPTIONS = ["All", "Active", "Inactive"];

export function CategoriesTableView({
  categories,
  loading,
  onCreate,
  onDeactivate,
  onReactivate,
}: {
  categories: Category[];
  loading: boolean;
  onCreate: (name: string) => Promise<void>;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const columns = React.useMemo(
    () => createCategoriesColumns({ onDeactivate, onReactivate }),
    [onDeactivate, onReactivate],
  );
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data: categories,
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
  const statusFilter = (table.getColumn("active")?.getFilterValue() as string) ?? "All";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate(name.trim());
      setName("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminTableCard
      title="Categories"
      description="Manage shelf categories used in proposals and filters."
      searchPlaceholder="Search categories…"
      searchValue={searchQuery}
      onSearchChange={(value) => {
        table.getColumn("search")?.setFilterValue(value || undefined);
        table.setPageIndex(0);
      }}
      filters={[
        {
          id: "active",
          label: "Status",
          value: statusFilter,
          options: STATUS_OPTIONS,
          onChange: (value) => {
            table.getColumn("active")?.setFilterValue(value === "All" ? undefined : value);
            table.setPageIndex(0);
          },
        },
      ]}
      actions={
        <form onSubmit={(e) => void handleCreate(e)} className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category"
            required
            className="h-7 w-40"
          />
          <Button type="submit" size="sm" disabled={saving || !name.trim()}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </form>
      }
    >
      {loading ? (
        <p className="px-4 text-muted-foreground text-sm">Loading…</p>
      ) : (
        <AdminDataTable table={table} />
      )}
    </AdminTableCard>
  );
}
