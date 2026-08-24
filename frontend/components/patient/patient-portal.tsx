"use client"

import * as React from "react"
import useSWR from "swr"
import { DoctorSearch } from "@/components/patient/doctor-search"
import { MyAppointments } from "@/components/patient/my-appointments"
import { SlotBoard } from "@/components/patient/slot-board"
import { PortalShell } from "@/components/portal-shell"
import { ConnectCalendarButton } from "@/components/shared/connect-calendar-button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { patientApi } from "@/lib/api"
import type { Doctor } from "@/lib/types"

export function PatientPortal() {
  const [tab, setTab] = React.useState("find")
  const [doctor, setDoctor] = React.useState<Doctor | null>(null)

  const appointments = useSWR("patient/appointments", () =>
    patientApi.appointments()
  )

  const upcoming = (appointments.data ?? []).filter(
    (item) => item.status === "BOOKED"
  ).length

  return (
    <PortalShell
      title="Book care that fits your day"
      description="Search by specialisation, pick an open slot and tell the clinician what's going on before you arrive."
      aside={
        <div className="flex items-center gap-3">
          <ConnectCalendarButton />
          <Badge variant="outline" className="font-mono">
            {upcoming} upcoming
          </Badge>
        </div>
      }
    >
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList>
          <TabsTrigger value="find">Find care</TabsTrigger>
          <TabsTrigger value="appointments">My appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="find" className="pt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <DoctorSearch selectedId={doctor?.id} onSelect={setDoctor} />
            <SlotBoard
              doctor={doctor}
              onBooked={() => {
                appointments.mutate()
                setTab("appointments")
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="pt-6">
          <MyAppointments
            appointments={appointments.data}
            isLoading={appointments.isLoading}
            error={appointments.error}
            onChanged={() => appointments.mutate()}
            onFindCare={() => setTab("find")}
          />
        </TabsContent>
      </Tabs>
    </PortalShell>
  )
}
