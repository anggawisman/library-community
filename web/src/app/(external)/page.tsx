"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LandingEventsCalendar } from "@/components/calendar/landing-events-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clearSession,
  getStoredUser,
  listCategories,
  listEvents,
  listPublicShelves,
  registerForEvent,
  type Category,
  type EventItem,
  type PublicUser,
  type Shelf,
  type ShelfCategory,
} from "@/lib/api";

export default function LandingPage() {
  const [category, setCategory] = useState<ShelfCategory | "">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((data) => {
        if (!cancelled) setCategories(data.filter((c) => c.active));
      })
      .catch((err: Error) => toast.error(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listPublicShelves(category || undefined), listEvents()])
      .then(([shelfData, eventData]) => {
        if (cancelled) return;
        setShelves(shelfData);
        setEvents(eventData);
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  async function onJoin(eventId: string) {
    const current = getStoredUser();
    if (!current) {
      toast.message("Sign in or register to join an event");
      window.location.href = "/auth/v1/login";
      return;
    }
    if (current.status !== "approved" || current.mustChangePassword) {
      toast.error("Your account must be approved before joining events");
      return;
    }
    try {
      await registerForEvent(eventId);
      toast.success("Registered for event");
      setEvents(await listEvents());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join");
    }
  }

  function onLogout() {
    clearSession();
    setUser(null);
    toast.success("Logged out");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-semibold text-lg tracking-tight">Community Member Shelves</p>
            <p className="text-muted-foreground text-sm">Curated minds. Shared books. Club events.</p>
          </div>
          <div className="flex gap-2">
            {user ? (
              <>
                <Button asChild variant="outline">
                  <Link prefetch={false} href="/dashboard/shelves">
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" onClick={onLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link prefetch={false} href="/auth/v1/login">
                    Sign in
                  </Link>
                </Button>
                <Button asChild>
                  <Link prefetch={false} href="/auth/v1/register">
                    Register
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold text-xl">Shelves</h2>
              <p className="text-muted-foreground text-sm">Accepted member shelves by category</p>
            </div>
            <select
              className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as ShelfCategory | "")}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : shelves.length === 0 ? (
            <p className="text-muted-foreground text-sm">No accepted shelves yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shelves.map((shelf) => (
                <Card key={shelf.id}>
                  <CardHeader>
                    <CardTitle>{shelf.title}</CardTitle>
                    <CardDescription>{shelf.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Goal:</span> {shelf.goal}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Mind-shaping:</span> {shelf.mindShapingIntent}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-xl">Events calendar</h2>
            <p className="text-muted-foreground text-sm">
              Accepted events on the club calendar. Click an event to join (approved accounts).
            </p>
          </div>
          <LandingEventsCalendar events={events} onJoin={onJoin} />
        </section>
      </main>
    </div>
  );
}
