"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { listCategories, listMyShelves, proposeShelf, type Category, type ShelfCategory } from "@/lib/api";

type ProposeValues = {
  title: string;
  category: ShelfCategory;
  goal: string;
  mindShapingIntent: string;
};

export default function ProposeShelfPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [checking, setChecking] = useState(true);
  const form = useForm<ProposeValues>({
    defaultValues: { title: "", category: "", goal: "", mindShapingIntent: "" },
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMyShelves(), listCategories()])
      .then(([shelves, cats]) => {
        if (cancelled) return;
        if (shelves.length > 0) {
          router.replace(`/dashboard/shelves/${shelves[0].id}`);
          return;
        }
        const active = cats.filter((c) => c.active);
        setCategories(active);
        if (active[0]) form.setValue("category", active[0].name);
        setChecking(false);
      })
      .catch((err: Error) => {
        toast.error(err.message);
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, form]);

  async function onSubmit(values: ProposeValues) {
    try {
      const shelf = await proposeShelf(values);
      toast.success("Proposal submitted for admin review");
      router.push(`/dashboard/shelves/${shelf.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not propose shelf");
    }
  }

  if (checking) {
    return <p className="p-6 text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-3xl leading-none tracking-tight">Propose your shelf</h1>
        <p className="text-muted-foreground text-sm">
          Members may have one shelf. Admin reviews goal and mind-shaping intent before acceptance.
        </p>
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
              Suggested category
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
            {form.formState.isSubmitting ? "Submitting…" : "Submit proposal"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link prefetch={false} href="/dashboard/shelves">
              Cancel
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
