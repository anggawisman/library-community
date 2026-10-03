"use client";
"use no memo";

import * as React from "react";
import { useForm } from "react-hook-form";

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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import type { Book, PublicUser } from "@/lib/api";

import { createBooksColumns } from "./books-columns";

type AddBookValues = {
  title: string;
  author: string;
  notes: string;
};

export function BooksTableView({
  books,
  isAdmin,
  canEditBooks,
  members,
  onRemove,
  onBorrow,
  onReturn,
  onAddBook,
}: {
  books: Book[];
  isAdmin: boolean;
  canEditBooks: boolean;
  members: PublicUser[];
  onRemove: (id: string) => void;
  onBorrow: (bookId: string, borrowerId: string) => void;
  onReturn: (bookId: string) => void;
  onAddBook: (values: { title: string; author: string; notes: string | null }) => Promise<void>;
}) {
  const form = useForm<AddBookValues>({
    defaultValues: { title: "", author: "", notes: "" },
  });
  const columns = React.useMemo(
    () =>
      createBooksColumns({
        isAdmin,
        canRemove: canEditBooks,
        members,
        onRemove,
        onBorrow,
        onReturn,
      }),
    [isAdmin, canEditBooks, members, onRemove, onBorrow, onReturn],
  );
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "title", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data: books,
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

  async function handleAdd(values: AddBookValues) {
    await onAddBook({
      title: values.title,
      author: values.author,
      notes: values.notes.trim() ? values.notes : null,
    });
    form.reset();
  }

  return (
    <AdminTableCard
      title="Books"
      description="Borrowing is offline — admin updates status after physical handoff."
      searchPlaceholder="Search books…"
      searchValue={searchQuery}
      onSearchChange={(value) => {
        table.getColumn("search")?.setFilterValue(value || undefined);
        table.setPageIndex(0);
      }}
    >
      <AdminDataTable table={table} />
      {canEditBooks ? (
        <form
          onSubmit={form.handleSubmit((values) => void handleAdd(values))}
          className="mx-4 mb-4 flex flex-col gap-4 rounded-xl border bg-card p-4"
        >
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field className="gap-1">
                <FieldLabel className="text-xs" htmlFor="book-title">
                  Book title
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput id="book-title" {...form.register("title", { required: true })} />
                </InputGroup>
              </Field>
              <Field className="gap-1">
                <FieldLabel className="text-xs" htmlFor="book-author">
                  Author
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput id="book-author" {...form.register("author", { required: true })} />
                </InputGroup>
              </Field>
            </div>
            <Field className="gap-1">
              <FieldLabel className="text-xs" htmlFor="book-notes">
                Notes
              </FieldLabel>
              <InputGroup>
                <InputGroupInput id="book-notes" {...form.register("notes")} />
              </InputGroup>
            </Field>
          </FieldGroup>
          <Button type="submit" size="sm" className="self-start">
            Add book
          </Button>
        </form>
      ) : null}
    </AdminTableCard>
  );
}
