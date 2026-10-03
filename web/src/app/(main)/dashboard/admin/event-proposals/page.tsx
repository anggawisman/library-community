"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { listEventProposals, reviewEvent, type EventItem } from "@/lib/api";

import { EventProposalsTableView } from "./_components/event-proposals-table-view";

export default function AdminEventProposalsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await listEventProposals());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onAccept = useCallback(
    (id: string) => {
      void reviewEvent(id, { status: "accepted" })
        .then(() => {
          toast.success("Event accepted");
          return load();
        })
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  const onReject = useCallback(
    (id: string) => {
      void reviewEvent(id, { status: "rejected" })
        .then(() => {
          toast.success("Event rejected");
          return load();
        })
        .catch((err: Error) => toast.error(err.message));
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <EventProposalsTableView events={events} loading={loading} onAccept={onAccept} onReject={onReject} />
    </div>
  );
}
