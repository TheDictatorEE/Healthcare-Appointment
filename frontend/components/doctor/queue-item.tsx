"use client"

import * as React from "react"
import { toast } from "sonner"
import { UserXIcon } from "lucide-react"
import { VisitDialog } from "@/components/doctor/visit-dialog"
import { StatusBadge, UrgencyBadge } from "@/components/shared/badges"
import { SummaryPanel } from "@/components/shared/summary-panel"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { doctorApi } from "@/lib/api"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Appointment } from "@/lib/types"

export function QueueItem({
  appointment,
  position,
  onChanged,
}: {
  appointment: Appointment
  position?: number
  onChanged: () => void
}) {
  const [pending, setPending] = React.useState(false)
  const [visitOpen, setVisitOpen] = React.useState(false)
  const open = appointment.status === "BOOKED"

  const patientName =
    appointment.patient?.user?.name ?? appointment.patient?.name ?? "Patient"

  async function markNoShow() {
    setPending(true)
    try {
      await doctorApi.noShow(appointment.id)
      toast.success(`${patientName} marked as no show`)
      onChanged()
    } catch (error) {
      toast.error("Could not update", {
        description: (error as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <article
      className={cn(
        "flex flex-col rounded-lg border bg-card",
        appointment.urgencyLevel === "HIGH" && open && "border-destructive/40",
        !open && "opacity-80"
      )}
    >
      <div className="flex flex-wrap items-start gap-4 p-4">
        <div className="flex w-20 flex-col gap-1 border-r pr-4">
          <span className="font-mono text-lg leading-none tabular">
            {formatTime(appointment.slotStart)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {position ? `#${position} in queue` : "closed"}
          </span>
        </div>

        <div className="flex min-w-52 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{patientName}</p>
            <UrgencyBadge level={appointment.urgencyLevel} />
            {!open ? <StatusBadge status={appointment.status} /> : null}
          </div>
          {appointment.patient?.user?.phone ? (
            <p className="font-mono text-xs text-muted-foreground">
              {appointment.patient.user.phone}
            </p>
          ) : null}
          {appointment.symptoms ? (
            <p className="pt-1 text-sm text-pretty">{appointment.symptoms}</p>
          ) : null}
        </div>

        {open ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markNoShow}
              disabled={pending}
            >
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UserXIcon data-icon="inline-start" />
              )}
              No show
            </Button>
            <Button size="sm" onClick={() => setVisitOpen(true)}>
              Complete visit
            </Button>
          </div>
        ) : null}
      </div>

      <Separator />
      <div className="flex flex-col gap-3 p-4">
        <SummaryPanel
          title="Triage / pre-visit summary"
          summary={appointment.preVisitSummary}
          emptyLabel="No triage summary available for this appointment."
        />
        {appointment.postVisitSummary ? (
          <SummaryPanel
            title="Post-visit record"
            summary={appointment.postVisitSummary}
          />
        ) : null}
      </div>

      <VisitDialog
        appointment={appointment}
        patientName={patientName}
        open={visitOpen}
        onOpenChange={setVisitOpen}
        onCompleted={onChanged}
      />
    </article>
  )
}
