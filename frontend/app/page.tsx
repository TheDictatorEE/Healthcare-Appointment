"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PORTAL_PATH, useAuth } from "@/components/auth/auth-provider"
import { Spinner } from "@/components/ui/spinner"

export default function HomePage() {
  const { status, user } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "loading") return
    router.replace(user ? (PORTAL_PATH[user.role] ?? "/login") : "/login")
  }, [status, user, router])

  return (
    <div className="flex min-h-svh items-center justify-center gap-3 text-sm text-muted-foreground">
      <Spinner />
      Opening your portal…
    </div>
  )
}
