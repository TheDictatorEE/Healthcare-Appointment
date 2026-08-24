export type Role = "PATIENT" | "DOCTOR" | "ADMIN"

export type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH"

export type AppointmentStatus = "BOOKED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  phone?: string | null
  googleConnected?: boolean
}

export interface Doctor {
  id: string
  specialisation: string
  slotDurationMin: number
  workingHours?: WorkingHours | null
  user: {
    id?: string
    name: string
    email?: string
  }
  onLeave?: boolean
}

export type WorkingHours = Record<string, [string, string] | null>

export interface Slot {
  slotStart: string
  slotEnd: string
}

export interface PrescriptionItem {
  medicine: string
  dosage: string
  frequency: string
  durationDays: number
}

export interface Appointment {
  id: string
  slotStart: string
  slotEnd: string
  status: AppointmentStatus
  symptoms?: string
  urgencyLevel?: UrgencyLevel
  preVisitSummary?: Record<string, unknown> | null
  postVisitSummary?: Record<string, unknown> | null
  doctor?: Doctor
  patient?: {
    id?: string
    user?: { name?: string; email?: string; phone?: string | null }
    name?: string
  }
}

export const WEEKDAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const
