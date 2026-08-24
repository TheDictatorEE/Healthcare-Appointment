import { RequireRole } from "@/components/auth/require-role"
import { PatientPortal } from "@/components/patient/patient-portal"

export default function PatientPage() {
  return (
    <RequireRole role="PATIENT">
      <PatientPortal />
    </RequireRole>
  )
}
