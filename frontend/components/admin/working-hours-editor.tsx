"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { WEEKDAYS, type WorkingHours } from "@/lib/types"

export const DEFAULT_HOURS: WorkingHours = {
  mon: ["09:00", "17:00"],
  tue: ["09:00", "17:00"],
  wed: ["09:00", "17:00"],
  thu: ["09:00", "17:00"],
  fri: ["09:00", "17:00"],
  sat: null,
  sun: null,
}

export function WorkingHoursEditor({
  value,
  onChange,
  idPrefix = "hours",
}: {
  value: WorkingHours
  onChange: (next: WorkingHours) => void
  idPrefix?: string
}) {
  function setDay(key: string, next: [string, string] | null) {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="flex flex-col gap-2">
      {WEEKDAYS.map((day) => {
        const hours = value[day.key] ?? null
        const enabled = hours !== null
        return (
          <div
            key={day.key}
            className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2"
          >
            <Switch
              id={`${idPrefix}-${day.key}`}
              checked={enabled}
              onCheckedChange={(checked) =>
                setDay(day.key, checked ? ["09:00", "17:00"] : null)
              }
            />
            <Label
              htmlFor={`${idPrefix}-${day.key}`}
              className="w-24 cursor-pointer text-sm"
            >
              {day.label}
            </Label>
            {enabled ? (
              <div className="ml-auto flex items-center gap-2">
                <Input
                  type="time"
                  aria-label={`${day.label} start time`}
                  value={hours![0]}
                  onChange={(event) =>
                    setDay(day.key, [event.target.value, hours![1]])
                  }
                  className="w-28 font-mono"
                />
                <span className="font-mono text-xs text-muted-foreground">
                  to
                </span>
                <Input
                  type="time"
                  aria-label={`${day.label} end time`}
                  value={hours![1]}
                  onChange={(event) =>
                    setDay(day.key, [hours![0], event.target.value])
                  }
                  className="w-28 font-mono"
                />
              </div>
            ) : (
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                closed
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function summariseHours(hours?: WorkingHours | null) {
  if (!hours) return "Not set"
  const open = WEEKDAYS.filter((day) => hours[day.key])
  if (open.length === 0) return "No working days"
  return open
    .map(
      (day) =>
        `${day.label.slice(0, 3)} ${hours[day.key]![0]}–${hours[day.key]![1]}`
    )
    .join(" · ")
}
