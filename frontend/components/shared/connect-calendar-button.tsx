"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { authApi, ApiError } from "@/lib/api"

/**
 * Sends the user through Google's OAuth consent flow so the backend can
 * create/update/delete Calendar events on their behalf. Backend endpoint
 * (/api/auth/google/connect) requires a valid Bearer token, which apiFetch
 * already attaches - so this only works once the user is logged in, which
 * is always true here since it's rendered inside the portals.
 */
export function ConnectCalendarButton() {
  const [loading, setLoading] = React.useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const url = await authApi.googleConnectUrl()
      // Full-page redirect to Google's consent screen. Google will redirect
      // back to our backend's /callback route, which then bounces the user
      // to FRONTEND_URL/settings?calendar=connected (see calendarService.js).
      window.location.href = url
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not start Google Calendar connection."
      toast.error(message)
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleConnect} disabled={loading}>
      <CalendarIcon data-icon="inline-start" />
      {loading ? "Redirecting…" : "Connect Google Calendar"}
    </Button>
  )
}
