"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createCategory,
  deactivateCategory,
  listAdminCategories,
  updateCategory,
  type Category,
} from "@/lib/api";

import { CategoriesTableView } from "./_components/categories-table-view";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await listAdminCategories());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = useCallback(
    async (name: string) => {
      try {
        await createCategory(name);
        toast.success("Category created");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create");
        throw err;
      }
    },
    [load],
  );

  const onDeactivate = useCallback(
    (id: string) => {
      void deactivateCategory(id)
        .then(() => load())
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  const onReactivate = useCallback(
    (id: string) => {
      void updateCategory(id, { active: true })
        .then(() => load())
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <CategoriesTableView
        categories={categories}
        loading={loading}
        onCreate={onCreate}
        onDeactivate={onDeactivate}
        onReactivate={onReactivate}
      />
    </div>
  );
}
