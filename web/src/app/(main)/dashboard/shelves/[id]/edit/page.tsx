"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getShelf, listCategories, updateShelf, type Category, type ShelfCategory } from "@/lib/api";

type EditValues = {
  title: string;
  category: ShelfCategory;
  goal: string;
  mindShapingIntent: string;
};

export default function EditShelfPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const form = useForm<EditValues>({
    defaultValues: { title: "", category: "", goal: "", mindShapingIntent: "" },
  });

  useEffect(() => {
    Promise.all([getShelf(params.id), listCategories()])
      .then(([shelf, cats]) => {
        form.reset({
          title: shelf.title,
          category: shelf.category,
          goal: shelf.goal,
          mindShapingIntent: shelf.mindShapingIntent,
        });
        const active = cats.filter((c) => c.active);
        if (!active.some((c) => c.name === shelf.category)) {
          setCategories([
            { id: "current", name: shelf.category, slug: shelf.category, active: true, createdAt: "" },
            ...active,
          ]);
        } else {
          setCategories(active);
        }
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [params.id, form]);

  async function onSubmit(values: EditValues) {
    try {
      await updateShelf(params.id, values);
      toast.success("Shelf updated");
      router.push(`/dashboard/shelves/${params.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update shelf");
    }
  }

  if (loading) {
    return <p className="p-6 text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-3xl leading-none tracking-tight">Edit shelf</h1>
        <p className="text-muted-foreground text-sm">Update curation fields for this shelf.</p>
      </div>

      <form
        onSubmit={form.handleSubmit((values) => void onSubmit(values))}
        className="flex flex-col gap-4 rounded-xl border bg-card p-4"
      >
        <FieldGroup>
          <Field className="gap-1">
            <FieldLabel className="text-xs" htmlFor="title">
              Title
            </FieldLabel>
            <InputGroup>
              <InputGroupInput id="title" {...form.register("title", { required: true })} />
            </InputGroup>
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs" htmlFor="category">
              Category
            </FieldLabel>
            <select
              id="category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              {...form.register("category", { required: true })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Separator />

          <Field className="gap-1">
            <FieldLabel className="text-xs" htmlFor="goal">
              Goal
            </FieldLabel>
            <Textarea id="goal" rows={3} {...form.register("goal", { required: true })} />
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs" htmlFor="intent">
              Mind-shaping intent
            </FieldLabel>
            <Textarea id="intent" rows={4} {...form.register("mindShapingIntent", { required: true })} />
          </Field>
        </FieldGroup>

        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link prefetch={false} href={`/dashboard/shelves/${params.id}`}>
              Cancel
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
