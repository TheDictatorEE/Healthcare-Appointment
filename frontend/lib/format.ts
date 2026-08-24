import type { UrgencyLevel } from "@/lib/types"

export function todayISO() {
  return toISODate(new Date())
}

export function toISODate(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function formatTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "--:--"
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatDateLong(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export const URGENCY_RANK: Record<UrgencyLevel, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
}

export function urgencyRank(level?: UrgencyLevel) {
  return level ? URGENCY_RANK[level] : 3
}

/**
 * Turns an LLM summary object (shape not guaranteed by the API) into
 * readable label / value pairs.
 */
export function summaryEntries(
  summary?: Record<string, unknown> | null
): { label: string; value: string }[] {
  if (!summary || typeof summary !== "object") return []
  return Object.entries(summary)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      label: key
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase()),
      value: Array.isArray(value)
        ? value
            .map((item) =>
              typeof item === "object" && item !== null
                ? Object.values(item as Record<string, unknown>).join(" · ")
                : String(item)
            )
            .join("\n")
        : typeof value === "object"
          ? Object.entries(value as Record<string, unknown>)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join("\n")
          : String(value),
    }))
}
