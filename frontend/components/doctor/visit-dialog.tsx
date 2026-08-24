"use client"

import * as React from "react"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon } from "lucide-react"
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
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { doctorApi } from "@/lib/api"
import { formatTime } from "@/lib/format"
import type { Appointment, PrescriptionItem } from "@/lib/types"

const MIN_NOTES = 10

type DraftLine = PrescriptionItem & { key: string }

function emptyLine(): DraftLine {
  return {
    key: Math.random().toString(36).slice(2),
    medicine: "",
    dosage: "",
    frequency: "",
    durationDays: 5,
  }
}

export function VisitDialog({
  appointment,
  patientName,
  open,
  onOpenChange,
  onCompleted,
}: {
  appointment: Appointment
  patientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted: () => void
}) {
  const [notes, setNotes] = React.useState("")
  const [lines, setLines] = React.useState<DraftLine[]>([emptyLine()])
  const [invalid, setInvalid] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setNotes("")
      setLines([emptyLine()])
      setInvalid(false)
    }
  }, [open])

  function updateLine(key: string, patch: Partial<PrescriptionItem>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = notes.trim()
    if (value.length < MIN_NOTES) {
      setInvalid(true)
      return
    }
    const prescription = lines
      .filter((line) => line.medicine.trim())
      .map(({ medicine, dosage, frequency, durationDays }) => ({
        medicine: medicine.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        durationDays: Number(durationDays) || 1,
      }))

    setPending(true)
    try {
      await doctorApi.complete(appointment.id, {
        clinicalNotes: value,
        prescription,
      })
      toast.success("Visit completed", {
        description: `${patientName} · ${prescription.length} prescribed item(s)`,
      })
      onOpenChange(false)
      onCompleted()
    } catch (error) {
      toast.error("Could not save the visit", {
        description: (error as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Post-visit record — {patientName}</DialogTitle>
            <DialogDescription>
              <span className="font-mono">
                {formatTime(appointment.slotStart)}–
                {formatTime(appointment.slotEnd)}
              </span>{" "}
              · notes are shared with the patient after saving.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={invalid || undefined}>
              <FieldLabel htmlFor="clinical-notes">Clinical notes</FieldLabel>
              <Textarea
                id="clinical-notes"
                rows={6}
                value={notes}
                aria-invalid={invalid || undefined}
                onChange={(event) => {
                  setNotes(event.target.value)
                  if (invalid) setInvalid(false)
                }}
                placeholder="Examination findings, assessment, plan and follow-up."
              />
              {invalid ? (
                <FieldError>
                  Add at least {MIN_NOTES} characters of clinical notes.
                </FieldError>
              ) : (
                <FieldDescription>
                  Include assessment and follow-up instructions.
                </FieldDescription>
              )}
            </Field>

            <FieldSet>
              <FieldLegend>Prescription</FieldLegend>
              <FieldDescription>
                Leave the medicine field blank to skip a line.
              </FieldDescription>
              <div className="flex flex-col gap-3 pt-1">
                {lines.map((line, index) => (
                  <div
                    key={line.key}
                    className="grid grid-cols-2 items-end gap-2 rounded-md border p-3 sm:grid-cols-[1.4fr_1fr_1fr_0.7fr_auto]"
                  >
                    <Field>
                      <FieldLabel htmlFor={`medicine-${line.key}`}>
                        Medicine
                      </FieldLabel>
                      <Input
                        id={`medicine-${line.key}`}
                        value={line.medicine}
                        onChange={(event) =>
                          updateLine(line.key, { medicine: event.target.value })
                        }
                        placeholder="Amoxicillin"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`dosage-${line.key}`}>
                        Dosage
                      </FieldLabel>
                      <Input
                        id={`dosage-${line.key}`}
                        value={line.dosage}
                        onChange={(event) =>
                          updateLine(line.key, { dosage: event.target.value })
                        }
                        placeholder="500 mg"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`frequency-${line.key}`}>
                        Frequency
                      </FieldLabel>
                      <Input
                        id={`frequency-${line.key}`}
                        value={line.frequency}
                        onChange={(event) =>
                          updateLine(line.key, { frequency: event.target.value })
                        }
                        placeholder="Twice daily"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`duration-${line.key}`}>
                        Days
                      </FieldLabel>
                      <Input
                        id={`duration-${line.key}`}
                        type="number"
                        min={1}
                        max={365}
                        value={line.durationDays}
                        onChange={(event) =>
                          updateLine(line.key, {
                            durationDays: Number(event.target.value),
                          })
                        }
                        className="font-mono"
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove prescription line ${index + 1}`}
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((current) =>
                          current.filter((item) => item.key !== line.key)
                        )
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() =>
                    setLines((current) => [...current, emptyLine()])
                  }
                >
                  <PlusIcon data-icon="inline-start" />
                  Add medicine
                </Button>
              </div>
            </FieldSet>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Discard
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Save & complete visit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
