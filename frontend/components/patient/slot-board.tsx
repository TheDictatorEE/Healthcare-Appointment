"use client"

import * as React from "react"
import useSWR from "swr"
import { CalendarOffIcon, CalendarSearchIcon, InfoIcon } from "lucide-react"
import { BookingDialog } from "@/components/patient/booking-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { patientApi } from "@/lib/api"
import { formatDateLong, formatTime, todayISO } from "@/lib/format"
import type { Doctor, Slot } from "@/lib/types"

export function SlotBoard({
  doctor,
  onBooked,
}: {
  doctor: Doctor | null
  onBooked: () => void
}) {
  const [date, setDate] = React.useState(todayISO())
  const [slot, setSlot] = React.useState<Slot | null>(null)

  const { data, isLoading, error, mutate } = useSWR(
    doctor ? ["patient/slots", doctor.id, date] : null,
    ([, doctorId, day]) => patientApi.slots(doctorId as string, day as string)
  )

  if (!doctor) {
    return (
      <Empty className="border bg-card lg:sticky lg:top-24">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarSearchIcon />
          </EmptyMedia>
          <EmptyTitle>Pick a clinician</EmptyTitle>
          <EmptyDescription>
            Select someone from the list to see the slots they have open.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const slots = data?.slots ?? []

  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>Dr {doctor.user?.name ?? "Unknown"}</CardTitle>
        <CardDescription>
          {doctor.specialisation} · {doctor.slotDurationMin ?? 30} min per visit
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Field className="max-w-48">
          <FieldLabel htmlFor="slot-date">Date</FieldLabel>
          <Input
            id="slot-date"
            type="date"
            value={date}
            min={todayISO()}
            onChange={(event) => setDate(event.target.value)}
            className="font-mono"
          />
        </Field>

        {data?.onLeave ? (
          <Alert>
            <CalendarOffIcon />
            <AlertTitle>On leave</AlertTitle>
            <AlertDescription>
              Dr {doctor.user?.name} is not seeing patients on{" "}
              {formatDateLong(date)}. Try another date.
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-9 rounded-md" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <InfoIcon />
            <AlertTitle>Could not load slots</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No open slots on {formatDateLong(date)}.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
              {slots.length} open · {formatDateLong(date)}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((item) => (
                <Button
                  key={item.slotStart}
                  variant="outline"
                  size="lg"
                  className="font-mono tabular"
                  onClick={() => setSlot(item)}
                >
                  {formatTime(item.slotStart)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <BookingDialog
        doctor={doctor}
        slot={slot}
        onClose={() => setSlot(null)}
        onBooked={() => {
          setSlot(null)
          mutate()
          onBooked()
        }}
      />
    </Card>
  )
}
