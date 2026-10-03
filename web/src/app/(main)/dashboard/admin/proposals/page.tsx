"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { listCategories, listProposals, reviewShelf, type Category, type Shelf, type ShelfCategory } from "@/lib/api";

import { ProposalsTableView } from "./_components/proposals-table-view";

export default function AdminProposalsPage() {
  const [proposals, setProposals] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Record<string, ShelfCategory>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([listProposals(), listCategories()]);
      setProposals(data);
      setCategoryOptions(cats.filter((c) => c.active));
      const map: Record<string, ShelfCategory> = {};
      for (const s of data) map[s.id] = s.category;
      setCategories(map);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCategoryChange = useCallback((id: string, category: ShelfCategory) => {
    setCategories((prev) => ({ ...prev, [id]: category }));
  }, []);

  const onAccept = useCallback(
    (id: string) => {
      void reviewShelf(id, { status: "accepted", category: categories[id] })
        .then(() => {
          toast.success("Shelf accepted");
          return load();
        })
        .catch((err: Error) => toast.error(err.message));
    },
    [categories, load],
  );

  const onReject = useCallback(
    (id: string) => {
      void reviewShelf(id, { status: "rejected", category: categories[id] })
        .then(() => {
          toast.success("Shelf rejected");
          return load();
        })
        .catch((err: Error) => toast.error(err.message));
    },
    [categories, load],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <ProposalsTableView
        proposals={proposals}
        categoryOptions={categoryOptions}
        categoryById={categories}
        loading={loading}
        onCategoryChange={onCategoryChange}
        onAccept={onAccept}
        onReject={onReject}
      />
    </div>
  );
}
