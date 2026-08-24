"use client"

import * as React from "react"
import { toast } from "sonner"
import { CalendarPlusIcon, ChevronDownIcon } from "lucide-react"
import { StatusBadge, UrgencyBadge } from "@/components/shared/badges"
import { SummaryPanel } from "@/components/shared/summary-panel"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { patientApi } from "@/lib/api"
import { formatDate, formatTime } from "@/lib/format"
import type { Appointment } from "@/lib/types"

export function MyAppointments({
  appointments,
  isLoading,
  error,
  onChanged,
  onFindCare,
}: {
  appointments?: Appointment[]
  isLoading: boolean
  error?: unknown
  onChanged: () => void
  onFindCare: () => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">{(error as Error).message}</p>
    )
  }

  const items = [...(appointments ?? [])].sort(
    (a, b) => new Date(b.slotStart).getTime() - new Date(a.slotStart).getTime()
  )

  if (items.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarPlusIcon />
          </EmptyMedia>
          <EmptyTitle>No appointments yet</EmptyTitle>
          <EmptyDescription>
            Once you book a visit it will show up here with your pre-visit
            summary.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onFindCare}>Find care</Button>
        </EmptyContent>
      </Empty>
    )
  }

  const upcoming = items.filter((item) => item.status === "BOOKED")
  const history = items.filter((item) => item.status !== "BOOKED")

  return (
    <div className="flex flex-col gap-8">
      <Section title={`Upcoming · ${upcoming.length}`}>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing booked right now.
          </p>
        ) : (
          upcoming.map((item) => (
            <AppointmentCard
              key={item.id}
              appointment={item}
              onChanged={onChanged}
            />
          ))
        )}
      </Section>

      {history.length > 0 ? (
        <Section title={`History · ${history.length}`}>
          {history.map((item) => (
            <AppointmentCard
              key={item.id}
              appointment={item}
              onChanged={onChanged}
            />
          ))}
        </Section>
      ) : null}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

function AppointmentCard({
  appointment,
  onChanged,
}: {
  appointment: Appointment
  onChanged: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  async function cancel() {
    setPending(true)
    try {
      await patientApi.cancel(appointment.id)
      toast.success("Appointment cancelled")
      onChanged()
    } catch (error) {
      toast.error("Could not cancel", {
        description: (error as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-start gap-4 p-4">
        {/* Time rail */}
        <div className="flex min-w-24 flex-col border-l-0 pl-0">
          <span className="font-mono text-lg leading-tight tabular">
            {formatTime(appointment.slotStart)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatDate(appointment.slotStart)}
          </span>
        </div>

        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <p className="font-medium">
            Dr {appointment.doctor?.user?.name ?? "Clinician"}
          </p>
          <p className="text-sm text-muted-foreground">
            {appointment.doctor?.specialisation ?? "General"}
          </p>
          {appointment.symptoms ? (
            <p className="pt-1 text-sm text-pretty">{appointment.symptoms}</p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <UrgencyBadge level={appointment.urgencyLevel} />
            <StatusBadge status={appointment.status} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
            >
              {open ? "Hide" : "Details"}
              <ChevronDownIcon
                data-icon="inline-end"
                className={open ? "rotate-180 transition-transform" : "transition-transform"}
              />
            </Button>
            {appointment.status === "BOOKED" ? (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive" size="sm" disabled={pending}>
                      {pending ? <Spinner data-icon="inline-start" /> : null}
                      Cancel
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your {formatTime(appointment.slotStart)} slot on{" "}
                      {formatDate(appointment.slotStart)} with Dr{" "}
                      {appointment.doctor?.user?.name} will be released to other
                      patients.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction onClick={cancel}>
                      Cancel appointment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <>
          <Separator />
          <div className="flex flex-col gap-3 p-4">
            <SummaryPanel
              title="Pre-visit summary"
              summary={appointment.preVisitSummary}
              emptyLabel="Triage summary will appear once processed."
            />
            <SummaryPanel
              title="Post-visit summary & prescription"
              summary={appointment.postVisitSummary}
              emptyLabel="Available after your visit is completed."
            />
          </div>
        </>
      ) : null}
    </article>
  )
}
