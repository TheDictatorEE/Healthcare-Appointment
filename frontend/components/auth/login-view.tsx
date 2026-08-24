"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircleIcon } from "lucide-react"
import { PORTAL_PATH, useAuth } from "@/components/auth/auth-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_BASE_URL, ApiError } from "@/lib/api"

const PORTALS = [
  {
    role: "Patient",
    copy: "Find a clinician, pick a slot and describe your symptoms before you arrive.",
  },
  {
    role: "Clinician",
    copy: "Work the day's queue in urgency order, then file notes and prescriptions.",
  },
  {
    role: "Administrator",
    copy: "Onboard doctors, set working hours and record leave days.",
  },
]

export function LoginView() {
  const { login, register, status, user } = useAuth()
  const router = useRouter()
  const [mode, setMode] = React.useState("signin")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(PORTAL_PATH[user.role] ?? "/login")
    }
  }, [status, user, router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      const nextUser =
        mode === "signin"
          ? await login(
              String(form.get("email") ?? "").trim(),
              String(form.get("password") ?? "")
            )
          : await register({
              name: String(form.get("name") ?? "").trim(),
              email: String(form.get("email") ?? "").trim(),
              password: String(form.get("password") ?? ""),
              phone: String(form.get("phone") ?? "").trim() || undefined,
            })
      router.replace(PORTAL_PATH[nextUser.role] ?? "/login")
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : "Something went wrong. Please try again."
      setError(message)
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between bg-primary px-10 py-12 text-primary-foreground lg:flex">
        <p className="font-mono text-xs tracking-[0.28em] uppercase">
          Meridian Care
        </p>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            One record. Three views of the same appointment.
          </h1>
          <ul className="flex flex-col gap-5 pt-8">
            {PORTALS.map((portal) => (
              <li key={portal.role} className="flex flex-col gap-1">
                <span className="font-mono text-xs tracking-widest uppercase opacity-80">
                  {portal.role}
                </span>
                <span className="text-sm leading-relaxed opacity-95 text-pretty">
                  {portal.copy}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="font-mono text-xs opacity-70">
          API · {API_BASE_URL}
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="pb-6 lg:hidden">
            <p className="font-mono text-xs tracking-[0.28em] text-primary uppercase">
              Meridian Care
            </p>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Sign in to your portal
          </h2>
          <p className="pt-1 text-sm text-muted-foreground text-pretty">
            Your role decides which portal opens after sign in.
          </p>

          <Tabs
            value={mode}
            onValueChange={(value) => {
              setMode(String(value))
              setError(null)
            }}
            className="pt-6"
          >
            <TabsList className="w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="register">New patient</TabsTrigger>
            </TabsList>

            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertCircleIcon />
                <AlertTitle>Could not continue</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <TabsContent value="signin" className="pt-4">
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="signin-email">Email</FieldLabel>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@clinic.org"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signin-password">Password</FieldLabel>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </Field>
                  <Button type="submit" size="lg" disabled={pending}>
                    {pending ? <Spinner data-icon="inline-start" /> : null}
                    Sign in
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>

            <TabsContent value="register" className="pt-4">
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="register-name">Full name</FieldLabel>
                    <Input
                      id="register-name"
                      name="name"
                      autoComplete="name"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="register-email">Email</FieldLabel>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="register-phone">Phone</FieldLabel>
                    <Input
                      id="register-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                    />
                    <FieldDescription>
                      Optional — used for appointment reminders.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="register-password">
                      Password
                    </FieldLabel>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <FieldDescription>
                      At least 8 characters.
                    </FieldDescription>
                  </Field>
                  <Button type="submit" size="lg" disabled={pending}>
                    {pending ? <Spinner data-icon="inline-start" /> : null}
                    Create patient account
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
          </Tabs>

          <p className="pt-6 font-mono text-xs text-muted-foreground">
            Clinician and admin accounts are created by an administrator.
          </p>
        </div>
      </section>
    </div>
  )
}
