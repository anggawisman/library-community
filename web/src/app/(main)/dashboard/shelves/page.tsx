"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStoredUser, listMyShelves, listPublicShelves, type Shelf } from "@/lib/api";

export default function ShelvesPage() {
  const router = useRouter();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    const admin = user?.role === "admin";
    setIsAdmin(Boolean(admin));
    let cancelled = false;
    const load = admin ? listPublicShelves() : listMyShelves();
    load
      .then((data) => {
        if (cancelled) return;
        if (!admin) {
          if (data.length > 0) {
            router.replace(`/dashboard/shelves/${data[0].id}`);
            return;
          }
          router.replace("/dashboard/shelves/new");
          return;
        }
        setShelves(data);
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!isAdmin) {
    return <p className="p-6 text-muted-foreground text-sm">Loading your shelf…</p>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Accepted shelves</h1>
        <p className="text-muted-foreground text-sm">
          Public accepted shelves. Review proposals under Admin.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : shelves.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No shelves yet</CardTitle>
            <CardDescription>Nothing accepted yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shelves.map((shelf) => (
            <Link key={shelf.id} prefetch={false} href={`/dashboard/shelves/${shelf.id}`}>
              <Card className="h-full transition hover:ring-foreground/20">
                <CardHeader>
                  <CardTitle>{shelf.title}</CardTitle>
                  <CardDescription>
                    {shelf.category} · {shelf.status}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
