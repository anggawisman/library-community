"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import { useCalendarController } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import multiMonthPlugin from "@fullcalendar/react/multimonth";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, XIcon } from "lucide-react";

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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { EventItem, Shelf } from "@/lib/api";

const views = [
  { key: "dayGridMonth", label: "Month" },
  { key: "timeGridWeek", label: "Week" },
  { key: "timeGridDay", label: "Day" },
];

const plugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin];

type CreateEventValues = {
  shelfId: string;
  title: string;
  startsAt: string;
  capacity: string;
  description: string;
};

function toCalendarEvents(events: EventItem[]) {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startsAt,
    end: event.endsAt ?? undefined,
    extendedProps: {
      shelfId: event.shelfId,
      shelfTitle: event.shelfTitle,
      description: event.description,
      registrationCount: event.registrationCount,
      capacity: event.capacity,
    },
  }));
}

export function DashboardEventsCalendar({
  events,
  shelves,
  role,
  onCreate,
  onJoin,
}: {
  events: EventItem[];
  shelves: Shelf[];
  role: "admin" | "member" | null;
  onCreate: (input: {
    shelfId: string;
    title: string;
    description: string;
    startsAt: string;
    capacity: number | null;
  }) => Promise<void>;
  onJoin: (eventId: string) => Promise<void>;
}) {
  const controller = useCalendarController();
  const [shelfFilter, setShelfFilter] = React.useState("all");
  const [addOpen, setAddOpen] = React.useState(false);
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

  const filteredEvents = React.useMemo(
    () => (shelfFilter === "all" ? events : events.filter((e) => e.shelfId === shelfFilter)),
    [events, shelfFilter],
  );
  const calendarEvents = React.useMemo(() => toCalendarEvents(filteredEvents), [filteredEvents]);
  const eventCount = React.useMemo(
    () =>
      calendarEvents.filter((event) => {
        const start = new Date(event.start);
        return start >= visibleRange.start && start < visibleRange.end;
      }).length,
    [calendarEvents, visibleRange.start, visibleRange.end],
  );

  const defaultShelfId = shelves[0]?.id ?? "";
  const form = useForm<CreateEventValues>({
    defaultValues: {
      shelfId: defaultShelfId,
      title: "",
      startsAt: "",
      capacity: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (shelves.length === 1) {
      form.setValue("shelfId", shelves[0].id);
    } else if (shelves[0] && !form.getValues("shelfId")) {
      form.setValue("shelfId", shelves[0].id);
    }
  }, [shelves, form]);

  async function handleCreate(values: CreateEventValues) {
    await onCreate({
      shelfId: values.shelfId,
      title: values.title,
      description: values.description,
      startsAt: new Date(values.startsAt).toISOString(),
      capacity: values.capacity ? Number(values.capacity) : null,
    });
    form.reset({
      shelfId: shelves.length === 1 ? shelves[0].id : values.shelfId,
      title: "",
      startsAt: "",
      capacity: "",
      description: "",
    });
    setAddOpen(false);
  }

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

  const canAdd = shelves.length > 0 && (role === "admin" || role === "member");

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
            <Select value={shelfFilter} onValueChange={setShelfFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <CalendarIcon />
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="all">All shelves</SelectItem>
                  {shelves.map((shelf) => (
                    <SelectItem key={shelf.id} value={shelf.id}>
                      {shelf.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
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
            <Button disabled={!canAdd} onClick={() => setAddOpen(true)}>
              <Plus />
              Add event
            </Button>
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
            const match = events.find((e) => e.id === info.event.id);
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{role === "admin" ? "Create event" : "Propose event"}</DialogTitle>
            <DialogDescription>
              {role === "admin"
                ? "Published immediately on an accepted shelf."
                : "Requires your accepted shelf. Admin must accept before it is public."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => void handleCreate(values))}
            className="flex flex-col gap-4 rounded-xl border bg-card p-4"
          >
            <FieldGroup>
              {shelves.length > 1 ? (
                <Field className="gap-1">
                  <FieldLabel className="text-xs" htmlFor="event-shelf">
                    Shelf
                  </FieldLabel>
                  <select
                    id="event-shelf"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    {...form.register("shelfId", { required: true })}
                  >
                    {shelves.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field className="gap-1">
                <FieldLabel className="text-xs" htmlFor="event-title">
                  Title
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput id="event-title" {...form.register("title", { required: true })} />
                </InputGroup>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field className="gap-1">
                  <FieldLabel className="text-xs" htmlFor="event-starts">
                    Starts at
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="event-starts"
                      type="datetime-local"
                      {...form.register("startsAt", { required: true })}
                    />
                  </InputGroup>
                </Field>
                <Field className="gap-1">
                  <FieldLabel className="text-xs" htmlFor="event-capacity">
                    Capacity
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput id="event-capacity" type="number" min={1} {...form.register("capacity")} />
                  </InputGroup>
                </Field>
              </div>
              <Separator />
              <Field className="gap-1">
                <FieldLabel className="text-xs" htmlFor="event-desc">
                  Description
                </FieldLabel>
                <Textarea id="event-desc" rows={3} {...form.register("description")} />
              </Field>
            </FieldGroup>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || !shelves.length}>
                {form.formState.isSubmitting
                  ? "Saving…"
                  : role === "admin"
                    ? "Create"
                    : "Propose"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                {role === "member" ? (
                  <Button disabled={joining} onClick={() => void handleJoin()}>
                    {joining ? "Joining…" : "Join event"}
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
