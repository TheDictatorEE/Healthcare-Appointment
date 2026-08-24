"use client"

import * as React from "react"
import useSWR from "swr"
import { SearchIcon, StethoscopeIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { patientApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Doctor } from "@/lib/types"

export function DoctorSearch({
  selectedId,
  onSelect,
}: {
  selectedId?: string
  onSelect: (doctor: Doctor) => void
}) {
  const [query, setQuery] = React.useState("")
  const [debounced, setDebounced] = React.useState("")

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading, error } = useSWR(
    ["patient/doctors", debounced],
    ([, specialisation]) => patientApi.searchDoctors(specialisation)
  )

  const doctors = data ?? []

  return (
    <section aria-labelledby="doctor-search-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2 id="doctor-search-heading" className="text-sm font-medium">
          Clinicians
        </h2>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by specialisation, e.g. Cardiology"
            aria-label="Search doctors by specialisation"
          />
        </InputGroup>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
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
            <EmptyTitle>No clinicians found</EmptyTitle>
            <EmptyDescription>
              Try a different specialisation, or clear the search to see
              everyone.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {doctors.map((doctor) => {
            const selected = doctor.id === selectedId
            return (
              <li key={doctor.id}>
                <button
                  type="button"
                  onClick={() => onSelect(doctor)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    selected && "border-primary bg-accent/60"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      Dr {doctor.user?.name ?? "Unknown"}
                    </span>
                    <Badge variant="secondary" className="text-[0.7rem]">
                      {doctor.specialisation}
                    </Badge>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {doctor.slotDurationMin ?? 30} min consultations
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
