"use client"

import * as React from "react"
import { toast } from "sonner"
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
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { patientApi } from "@/lib/api"
import { formatDateLong, formatTime, toISODate } from "@/lib/format"
import type { Doctor, Slot } from "@/lib/types"

const MIN_LENGTH = 10

export function BookingDialog({
  doctor,
  slot,
  onClose,
  onBooked,
}: {
  doctor: Doctor
  slot: Slot | null
  onClose: () => void
  onBooked: () => void
}) {
  const [symptoms, setSymptoms] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [invalid, setInvalid] = React.useState(false)

  React.useEffect(() => {
    if (slot) {
      setSymptoms("")
      setInvalid(false)
    }
  }, [slot])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!slot) return
    const value = symptoms.trim()
    if (value.length < MIN_LENGTH) {
      setInvalid(true)
      return
    }
    setPending(true)
    try {
      await patientApi.book({
        doctorId: doctor.id,
        slotStart: slot.slotStart,
        symptoms: value,
      })
      toast.success("Appointment booked", {
        description: `Dr ${doctor.user?.name} · ${formatTime(slot.slotStart)} on ${formatDateLong(toISODate(new Date(slot.slotStart)))}`,
      })
      onBooked()
    } catch (error) {
      toast.error("Could not book this slot", {
        description: (error as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={!!slot}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirm your appointment</DialogTitle>
            <DialogDescription>
              {slot ? (
                <>
                  Dr {doctor.user?.name} · {doctor.specialisation} ·{" "}
                  <span className="font-mono">
                    {formatTime(slot.slotStart)}–{formatTime(slot.slotEnd)}
                  </span>{" "}
                  on {formatDateLong(toISODate(new Date(slot.slotStart)))}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={invalid || undefined}>
              <FieldLabel htmlFor="symptoms">
                What brings you in today?
              </FieldLabel>
              <Textarea
                id="symptoms"
                rows={5}
                value={symptoms}
                aria-invalid={invalid || undefined}
                onChange={(event) => {
                  setSymptoms(event.target.value)
                  if (invalid) setInvalid(false)
                }}
                placeholder="Describe your symptoms, when they started, and anything that makes them better or worse."
              />
              {invalid ? (
                <FieldError>
                  Please add at least {MIN_LENGTH} characters so your clinician
                  can triage.
                </FieldError>
              ) : (
                <FieldDescription>
                  This is triaged before your visit so urgent cases are seen
                  first.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Book appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
