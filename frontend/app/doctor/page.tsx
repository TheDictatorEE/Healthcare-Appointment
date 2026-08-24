import { RequireRole } from "@/components/auth/require-role"
import { DoctorPortal } from "@/components/doctor/doctor-portal"

export default function DoctorPage() {
  return (
    <RequireRole role="DOCTOR">
      <DoctorPortal />
    </RequireRole>
  )
}
