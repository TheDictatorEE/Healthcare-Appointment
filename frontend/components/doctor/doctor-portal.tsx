"use client"

import * as React from "react"
import useSWR from "swr"
import { CalendarCheckIcon } from "lucide-react"
import { QueueItem } from "@/components/doctor/queue-item"
import { PortalShell } from "@/components/portal-shell"
import { ConnectCalendarButton } from "@/components/shared/connect-calendar-button"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { doctorApi } from "@/lib/api"
import { formatDateLong, todayISO, urgencyRank } from "@/lib/format"
import type { Appointment } from "@/lib/types"

export function DoctorPortal() {
  const [date, setDate] = React.useState(todayISO())

  const { data, isLoading, error, mutate } = useSWR(
    ["doctor/appointments", date],
    ([, day]) => doctorApi.appointments(day as string)
  )

  const queue = React.useMemo(() => sortQueue(data ?? []), [data])
  const waiting = queue.filter((item) => item.status === "BOOKED")
  const done = queue.filter((item) => item.status !== "BOOKED")
  const high = waiting.filter((item) => item.urgencyLevel === "HIGH").length

  return (
    <PortalShell
      title={date === todayISO() ? "Today's queue" : formatDateLong(date)}
      description="Highest urgency first, then by slot time. Open a patient to read their triage summary and file post-visit notes."
      aside={
        <div className="flex items-end gap-4">
          <ConnectCalendarButton />
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="font-mono">
              {waiting.length} waiting
            </Badge>
            {high > 0 ? (
              <Badge
                variant="outline"
                className="border-destructive/40 bg-destructive/10 font-mono text-destructive"
              >
                {high} high urgency
              </Badge>
            ) : null}
          </div>
          <Field className="w-40">
            <FieldLabel htmlFor="queue-date">Queue date</FieldLabel>
            <Input
              id="queue-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="font-mono"
            />
          </Field>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : queue.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarCheckIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing scheduled</EmptyTitle>
            <EmptyDescription>
              No appointments on {formatDateLong(date)}.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
              In queue
            </h2>
            {waiting.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Queue cleared. Nice work.
              </p>
            ) : (
              waiting.map((appointment, index) => (
                <QueueItem
                  key={appointment.id}
                  position={index + 1}
                  appointment={appointment}
                  onChanged={() => mutate()}
                />
              ))
            )}
          </section>

          {done.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
                Closed today · {done.length}
              </h2>
              {done.map((appointment) => (
                <QueueItem
                  key={appointment.id}
                  appointment={appointment}
                  onChanged={() => mutate()}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}
    </PortalShell>
  )
}

function sortQueue(items: Appointment[]) {
  return [...items].sort((a, b) => {
    const byUrgency = urgencyRank(a.urgencyLevel) - urgencyRank(b.urgencyLevel)
    if (byUrgency !== 0) return byUrgency
    return new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime()
  })
}
