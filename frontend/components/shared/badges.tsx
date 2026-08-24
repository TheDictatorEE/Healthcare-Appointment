import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AppointmentStatus, UrgencyLevel } from "@/lib/types"

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  BOOKED: "Booked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge
      variant={status === "BOOKED" ? "default" : "secondary"}
      className={cn(
        "font-mono text-[0.7rem] tracking-wider uppercase",
        status === "CANCELLED" && "text-muted-foreground line-through",
        status === "NO_SHOW" && "text-destructive"
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

const URGENCY_STYLE: Record<UrgencyLevel, string> = {
  HIGH: "border-destructive/40 bg-destructive/10 text-destructive",
  MEDIUM: "border-warning/50 bg-warning/15 text-warning-foreground",
  LOW: "border-border bg-muted text-muted-foreground",
}

export function UrgencyBadge({
  level,
  className,
}: {
  level?: UrgencyLevel
  className?: string
}) {
  if (!level) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-mono text-[0.7rem] tracking-wider text-muted-foreground uppercase",
          className
        )}
      >
        Untriaged
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[0.7rem] tracking-wider uppercase",
        URGENCY_STYLE[level],
        className
      )}
    >
      {level === "HIGH" ? "High urgency" : level === "MEDIUM" ? "Medium" : "Low"}
    </Badge>
  )
}
