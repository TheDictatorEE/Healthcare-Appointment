"use client"

import * as React from "react"
import useSWR from "swr"
import { PlusIcon, StethoscopeIcon, UserRoundXIcon } from "lucide-react"
import { CreateDoctorDialog } from "@/components/admin/create-doctor-dialog"
import { LeaveDialog } from "@/components/admin/leave-dialog"
import { summariseHours } from "@/components/admin/working-hours-editor"
import { PortalShell } from "@/components/portal-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminApi } from "@/lib/api"
import type { Doctor } from "@/lib/types"

export function AdminPortal() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [leaveFor, setLeaveFor] = React.useState<Doctor | null>(null)

  const { data, isLoading, error, mutate } = useSWR("admin/doctors", () =>
    adminApi.doctors()
  )

  const doctors = data ?? []
  const specialities = new Set(doctors.map((doctor) => doctor.specialisation))

  return (
    <PortalShell
      title="Clinician roster"
      description="Create clinician accounts, set the working hours that generate patient slots, and close days when someone is away."
      aside={
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="font-mono">
              {doctors.length} clinicians
            </Badge>
            <Badge variant="outline" className="font-mono">
              {specialities.size} specialities
            </Badge>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            New clinician
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : doctors.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StethoscopeIcon />
            </EmptyMedia>
            <EmptyTitle>No clinicians yet</EmptyTitle>
            <EmptyDescription>
              Create the first clinician profile to open the booking calendar.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            New clinician
          </Button>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinician</TableHead>
                <TableHead>Specialisation</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Working hours
                </TableHead>
                <TableHead className="text-right">Slot</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{doctor.user?.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {doctor.user?.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doctor.specialisation}</Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-[220px] lg:table-cell">
                    <span
                      className="block truncate font-mono text-xs text-muted-foreground"
                      title={summariseHours(doctor.workingHours)}
                    >
                      {summariseHours(doctor.workingHours)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {doctor.slotDurationMin}m
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLeaveFor(doctor)}
                    >
                      <UserRoundXIcon data-icon="inline-start" />
                      Mark leave
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateDoctorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => mutate()}
      />
      <LeaveDialog
        doctor={leaveFor}
        onClose={() => setLeaveFor(null)}
        onSaved={() => mutate()}
      />
    </PortalShell>
  )
}
