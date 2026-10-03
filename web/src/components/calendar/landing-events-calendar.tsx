"use client";

import * as React from "react";

import { useCalendarController } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import multiMonthPlugin from "@fullcalendar/react/multimonth";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, XIcon } from "lucide-react";

import { EventCalendarViews } from "@/components/calendar/event-calendar-views";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EventItem } from "@/lib/api";

const views = [
  { key: "dayGridMonth", label: "Month" },
  { key: "timeGridWeek", label: "Week" },
  { key: "timeGridDay", label: "Day" },
];

const plugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin];

type EventExtended = {
  shelfTitle: string;
  description: string;
  registrationCount: number;
  capacity: number | null;
};

function toCalendarEvents(events: EventItem[]) {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startsAt,
    end: event.endsAt ?? undefined,
    extendedProps: {
      shelfTitle: event.shelfTitle,
      description: event.description,
      registrationCount: event.registrationCount,
      capacity: event.capacity,
    } satisfies EventExtended,
  }));
}

export function LandingEventsCalendar({
  events,
  onJoin,
}: {
  events: EventItem[];
  onJoin: (eventId: string) => void | Promise<void>;
}) {
  const controller = useCalendarController();
  const calendarEvents = React.useMemo(() => toCalendarEvents(events), [events]);
  const [selected, setSelected] = React.useState<EventItem | null>(null);
  const [joining, setJoining] = React.useState(false);
  const [visibleRange, setVisibleRange] = React.useState(() => {
    const now = new Date();
    return {
      title: format(now, "MMMM yyyy"),
      days: differenceInCalendarDays(endOfMonth(now), startOfMonth(now)) + 1,
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  });
  const eventCount = React.useMemo(
    () =>
      calendarEvents.filter((event) => {
        const start = new Date(event.start);
        return start >= visibleRange.start && start < visibleRange.end;
      }).length,
    [calendarEvents, visibleRange.start, visibleRange.end],
  );

  async function handleJoin() {
    if (!selected) return;
    setJoining(true);
    try {
      await onJoin(selected.id);
      setSelected(null);
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-md border">
        <div className="flex flex-col gap-4 border-b bg-sidebar p-4 text-sidebar-foreground lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 shrink-0 flex-col gap-1">
            <div className="font-medium text-lg leading-none">{visibleRange.title}</div>
            <p className="text-muted-foreground text-sm">
              {visibleRange.days} days - {eventCount} events
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ButtonGroup>
              <Button size="icon" variant="outline" onClick={() => controller.prev()}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" onClick={() => controller.today()}>
                Today
              </Button>
              <Button size="icon" variant="outline" onClick={() => controller.next()}>
                <ChevronRight />
              </Button>
            </ButtonGroup>
            <Select
              value={controller.view?.type ?? views[0].key}
              onValueChange={(value) => {
                controller.changeView(value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  {views.map((v) => (
                    <SelectItem key={v.key} value={v.key}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <EventCalendarViews
          controller={controller}
          initialView={views[0].key}
          plugins={[...plugins]}
          popoverCloseContent={() => <XIcon className="size-5 text-muted-foreground group-hover:text-foreground" />}
          events={calendarEvents}
          nowIndicator
          eventClick={(info) => {
            const id = info.event.id;
            const match = events.find((e) => e.id === id);
            if (match) setSelected(match);
          }}
          datesSet={(info) => {
            setVisibleRange({
              title: info.view.title,
              days: differenceInCalendarDays(info.view.currentEnd, info.view.currentStart),
              start: info.start,
              end: info.end,
            });
          }}
        />
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.shelfTitle} · {format(parseISO(selected.startsAt), "PPp")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p>{selected.description || "No description"}</p>
                <p className="text-muted-foreground">
                  Registered: {selected.registrationCount}
                  {selected.capacity ? ` / ${selected.capacity}` : ""}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button disabled={joining} onClick={() => void handleJoin()}>
                  {joining ? "Joining…" : "Join event"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
