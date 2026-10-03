"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { DashboardEventsCalendar } from "@/components/calendar/dashboard-events-calendar";
import {
  createEvent,
  getStoredUser,
  listEvents,
  listMyShelves,
  listPublicShelves,
  registerForEvent,
  type EventItem,
  type Shelf,
} from "@/lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [userRole, setUserRole] = useState<"admin" | "member" | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const user = getStoredUser();
      setUserRole(user?.role ?? null);
      const [eventData, shelfData] = await Promise.all([
        listEvents(),
        user?.role === "admin" ? listPublicShelves() : listMyShelves(),
      ]);
      setEvents(eventData);
      setShelves(shelfData.filter((s) => s.status === "accepted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = useCallback(
    async (input: {
      shelfId: string;
      title: string;
      description: string;
      startsAt: string;
      capacity: number | null;
    }) => {
      try {
        await createEvent(input);
        toast.success(
          userRole === "admin" ? "Event created" : "Event proposed for admin review",
        );
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create event");
        throw err;
      }
    },
    [userRole, load],
  );

  const onJoin = useCallback(
    async (eventId: string) => {
      try {
        await registerForEvent(eventId);
        toast.success("Joined event");
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not join");
        throw err;
      }
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Events</h1>
        <p className="text-muted-foreground text-sm">
          {userRole === "admin"
            ? "Publish events on accepted shelves. Member proposals appear under Event proposals."
            : "Propose events on your accepted shelf and join published club events."}
        </p>
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <DashboardEventsCalendar
          events={events}
          shelves={shelves}
          role={userRole}
          onCreate={onCreate}
          onJoin={onJoin}
        />
      )}
    </div>
  );
}
