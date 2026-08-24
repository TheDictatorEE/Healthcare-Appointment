"use client"

import * as React from "react"
import { toast } from "sonner"
import { TriangleAlertIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { adminApi } from "@/lib/api"
import { formatDateLong, todayISO } from "@/lib/format"
import type { Doctor } from "@/lib/types"

export function LeaveDialog({
  doctor,
  onClose,
  onSaved,
}: {
  doctor: Doctor | null
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = React.useState(todayISO())
  const [reason, setReason] = React.useState("")
  const [invalid, setInvalid] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    if (doctor) {
      setDate(todayISO())
      setReason("")
      setInvalid(false)
    }
  }, [doctor])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!doctor) return
    if (!date) {
      setInvalid(true)
      return
    }
    setPending(true)
    try {
      const result = await adminApi.addLeave(doctor.id, {
        date,
        reason: reason.trim() || undefined,
      })
      const affected = result?.affectedCount ?? 0
      toast.success(`${doctor.user?.name} marked on leave`, {
        description:
          affected > 0
            ? `${formatDateLong(date)} · ${affected} appointment${affected === 1 ? "" : "s"} cancelled`
            : `${formatDateLong(date)} · no appointments affected`,
      })
      onSaved()
      onClose()
    } catch (error) {
      toast.error("Could not record this leave day", {
        description: (error as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={!!doctor}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Mark leave day</DialogTitle>
            <DialogDescription>
              {doctor
                ? `${doctor.user?.name} · ${doctor.specialisation}`
                : null}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={invalid || undefined}>
              <FieldLabel htmlFor="leave-date">Date</FieldLabel>
              <Input
                id="leave-date"
                type="date"
                value={date}
                aria-invalid={invalid || undefined}
                onChange={(event) => {
                  setDate(event.target.value)
                  if (invalid) setInvalid(false)
                }}
                className="font-mono"
              />
              {invalid ? (
                <FieldError>Pick the day to close.</FieldError>
              ) : (
                <FieldDescription>
                  Slots stop being offered for this day.
                </FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="leave-reason">Reason (optional)</FieldLabel>
              <Textarea
                id="leave-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Conference, annual leave, sick day…"
              />
            </Field>

            <Alert>
              <TriangleAlertIcon />
              <AlertTitle>Existing bookings are cancelled</AlertTitle>
              <AlertDescription>
                Any appointment already booked on this date will be cancelled by
                the backend so patients can rebook.
              </AlertDescription>
            </Alert>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Confirm leave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
