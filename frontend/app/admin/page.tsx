import { AdminPortal } from "@/components/admin/admin-portal"
import { RequireRole } from "@/components/auth/require-role"

export default function AdminPage() {
  return (
    <RequireRole role="ADMIN">
      <AdminPortal />
    </RequireRole>
  )
}
