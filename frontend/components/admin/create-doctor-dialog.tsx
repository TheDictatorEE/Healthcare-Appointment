"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  DEFAULT_HOURS,
  WorkingHoursEditor,
} from "@/components/admin/working-hours-editor"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { adminApi } from "@/lib/api"
import type { WorkingHours } from "@/lib/types"

type Errors = Partial<
  Record<"name" | "email" | "password" | "specialisation" | "hours", string>
>

export function CreateDoctorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [specialisation, setSpecialisation] = React.useState("")
  const [slotDuration, setSlotDuration] = React.useState("30")
  const [hours, setHours] = React.useState<WorkingHours>(DEFAULT_HOURS)
  const [errors, setErrors] = React.useState<Errors>({})
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setPassword("")
      setSpecialisation("")
      setSlotDuration("30")
      setHours(DEFAULT_HOURS)
      setErrors({})
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Errors = {}
    if (name.trim().length < 2) next.name = "Enter the clinician's full name."
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      next.email = "Enter a valid work email address."
    if (password.length < 8)
      next.password = "Use at least 8 characters for the initial password."
    if (specialisation.trim().length < 2)
      next.specialisation = "Specialisation is required."
    const openDays = Object.values(hours).filter(Boolean).length
    if (openDays === 0) next.hours = "Enable at least one working day."

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setPending(true)
    try {
      await adminApi.createDoctor({
        name: name.trim(),
        email: email.trim(),
        password,
        specialisation: specialisation.trim(),
        slotDurationMin: Number(slotDuration) || 30,
        workingHours: hours,
      })
      toast.success("Clinician profile created", {
        description: `${name.trim()} · ${specialisation.trim()}`,
      })
      onCreated()
      onOpenChange(false)
    } catch (error) {
      toast.error("Could not create this profile", {
        description: (error as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New clinician profile</DialogTitle>
            <DialogDescription>
              Creates the login account and the schedule the booking engine uses
              to generate patient slots.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.name || undefined}>
                <FieldLabel htmlFor="doctor-name">Full name</FieldLabel>
                <Input
                  id="doctor-name"
                  value={name}
                  aria-invalid={!!errors.name || undefined}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Amara Osei"
                  autoComplete="off"
                />
                {errors.name ? <FieldError>{errors.name}</FieldError> : null}
              </Field>

              <Field data-invalid={!!errors.specialisation || undefined}>
                <FieldLabel htmlFor="doctor-specialisation">
                  Specialisation
                </FieldLabel>
                <Input
                  id="doctor-specialisation"
                  value={specialisation}
                  aria-invalid={!!errors.specialisation || undefined}
                  onChange={(event) => setSpecialisation(event.target.value)}
                  placeholder="Cardiology"
                  autoComplete="off"
                />
                {errors.specialisation ? (
                  <FieldError>{errors.specialisation}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.email || undefined}>
                <FieldLabel htmlFor="doctor-email">Work email</FieldLabel>
                <Input
                  id="doctor-email"
                  type="email"
                  value={email}
                  aria-invalid={!!errors.email || undefined}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="a.osei@meridian.health"
                  className="font-mono"
                  autoComplete="off"
                />
                {errors.email ? <FieldError>{errors.email}</FieldError> : null}
              </Field>

              <Field data-invalid={!!errors.password || undefined}>
                <FieldLabel htmlFor="doctor-password">
                  Initial password
                </FieldLabel>
                <Input
                  id="doctor-password"
                  type="text"
                  value={password}
                  aria-invalid={!!errors.password || undefined}
                  onChange={(event) => setPassword(event.target.value)}
                  className="font-mono"
                  autoComplete="new-password"
                />
                {errors.password ? (
                  <FieldError>{errors.password}</FieldError>
                ) : (
                  <FieldDescription>
                    Share this once; the clinician can change it after signing
                    in.
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="doctor-slot">
                  Slot length (minutes)
                </FieldLabel>
                <Input
                  id="doctor-slot"
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={slotDuration}
                  onChange={(event) => setSlotDuration(event.target.value)}
                  className="font-mono"
                />
                <FieldDescription>
                  Working hours are divided into slots of this length.
                </FieldDescription>
              </Field>
            </div>

            <FieldSeparator />

            <FieldSet data-invalid={!!errors.hours || undefined}>
              <FieldLegend>Working hours</FieldLegend>
              <FieldDescription>
                Turn a day off to close it entirely.
              </FieldDescription>
              <WorkingHoursEditor
                value={hours}
                onChange={(next) => {
                  setHours(next)
                  if (errors.hours) setErrors({ ...errors, hours: undefined })
                }}
                idPrefix="new-doctor"
              />
              {errors.hours ? <FieldError>{errors.hours}</FieldError> : null}
            </FieldSet>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Create profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
