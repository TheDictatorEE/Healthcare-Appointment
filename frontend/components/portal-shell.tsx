"use client"

import * as React from "react"
import { LogOutIcon } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ROLE_LABEL: Record<string, string> = {
  PATIENT: "Patient portal",
  DOCTOR: "Clinician portal",
  ADMIN: "Administration",
}

export function PortalShell({
  title,
  description,
  children,
  aside,
}: {
  title: string
  description: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs tracking-[0.2em] text-primary uppercase">
              Meridian
            </span>
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <span className="text-sm font-medium">
              {ROLE_LABEL[user?.role ?? ""] ?? "Portal"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium">{user?.name}</p>
              <p className="font-mono text-xs leading-tight text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <Badge variant="outline" className="font-mono">
              {user?.role}
            </Badge>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div className="max-w-xl">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {title}
            </h1>
            <p className="pt-1 text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          </div>
          {aside}
        </div>
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 font-mono text-xs text-muted-foreground sm:px-6">
          Meridian Care · clinical use only · all requests signed with your
          session token
        </div>
      </footer>
    </div>
  )
}
