"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PORTAL_PATH, useAuth } from "@/components/auth/auth-provider"
import { Spinner } from "@/components/ui/spinner"
import type { Role } from "@/lib/types"

export function RequireRole({
  role,
  children,
}: {
  role: Role
  children: React.ReactNode
}) {
  const { user, status } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login")
      return
    }
    if (status === "authenticated" && user && user.role !== role) {
      router.replace(PORTAL_PATH[user.role] ?? "/login")
    }
  }, [status, user, role, router])

  if (status !== "authenticated" || user?.role !== role) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-3 text-sm text-muted-foreground">
        <Spinner />
        Verifying your session…
      </div>
    )
  }

  return <>{children}</>
}
