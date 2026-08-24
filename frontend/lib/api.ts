import type {
  Appointment,
  Doctor,
  PrescriptionItem,
  Slot,
  User,
  WorkingHours,
} from "@/lib/types"

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api"

const TOKEN_KEY = "hcm.jwt"

/* ----------------------------- token storage ----------------------------- */

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable */
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

/* -------------------------------- fetcher -------------------------------- */

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  /** Skip the Authorization header (login / register). */
  anonymous?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  )
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, query, anonymous, signal }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"

  if (!anonymous) {
    const token = getToken()
    // Every authenticated call carries the stored JWT as a Bearer token.
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error
    console.log("[v0] network error calling", path, error)
    throw new ApiError(
      0,
      `Cannot reach the API at ${API_BASE_URL}. Make sure the backend is running.`
    )
  }

  const text = await response.text()
  let payload: unknown = undefined
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string; error?: string })?.message ||
      (payload as { error?: string })?.error ||
      (typeof payload === "string" && payload) ||
      response.statusText ||
      "Request failed"
    if (response.status === 401) clearToken()
    throw new ApiError(response.status, message, payload)
  }

  return payload as T
}

/* ---------------------------------- auth --------------------------------- */

type AuthResponse = { token: string; user: User }

function normalizeUser(raw: unknown): User {
  const source = (raw as { user?: unknown })?.user ?? raw
  const user = source as User & { role?: string }
  return {
    ...user,
    role: String(user.role ?? "PATIENT").toUpperCase() as User["role"],
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      anonymous: true,
    }).then((res) => ({ token: res.token, user: normalizeUser(res) })),

  register: (input: {
    name: string
    email: string
    password: string
    phone?: string
  }) =>
    apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: input,
      anonymous: true,
    }).then((res) => ({ token: res.token, user: normalizeUser(res) })),

  me: (signal?: AbortSignal) =>
    apiFetch<unknown>("/auth/me", { signal }).then(normalizeUser),

  googleConnectUrl: () =>
    apiFetch<{ url: string }>("/auth/google/connect").then((res) => res.url),
}

/* -------------------------------- patient -------------------------------- */

export const patientApi = {
  searchDoctors: (specialisation?: string) =>
    apiFetch<{ doctors: Doctor[] }>("/patient/doctors", {
      query: { specialisation },
    }).then((res) => res.doctors ?? []),

  slots: (doctorId: string, date: string) =>
    apiFetch<{ slots: Slot[]; onLeave?: boolean }>(
      `/patient/doctors/${doctorId}/slots`,
      { query: { date } }
    ).then((res) => ({ slots: res.slots ?? [], onLeave: !!res.onLeave })),

  book: (input: { doctorId: string; slotStart: string; symptoms: string }) =>
    apiFetch<{ appointment: Appointment }>("/patient/appointments", {
      method: "POST",
      body: input,
    }),

  appointments: () =>
    apiFetch<{ appointments: Appointment[] }>("/patient/appointments").then(
      (res) => res.appointments ?? []
    ),

  cancel: (appointmentId: string) =>
    apiFetch(`/patient/appointments/${appointmentId}/cancel`, {
      method: "POST",
    }),
}

/* --------------------------------- doctor -------------------------------- */

export const doctorApi = {
  appointments: (date?: string) =>
    apiFetch<{ appointments: Appointment[] }>("/doctor/appointments", {
      query: { date },
    }).then((res) => res.appointments ?? []),

  complete: (
    appointmentId: string,
    input: { clinicalNotes: string; prescription?: PrescriptionItem[] }
  ) =>
    apiFetch(`/doctor/appointments/${appointmentId}/complete`, {
      method: "POST",
      body: input,
    }),

  noShow: (appointmentId: string) =>
    apiFetch(`/doctor/appointments/${appointmentId}/no-show`, {
      method: "POST",
    }),
}

/* --------------------------------- admin --------------------------------- */

export const adminApi = {
  doctors: () =>
    apiFetch<{ doctors: Doctor[] }>("/admin/doctors").then(
      (res) => res.doctors ?? []
    ),

  createDoctor: (input: {
    name: string
    email: string
    password: string
    specialisation: string
    slotDurationMin: number
    workingHours: WorkingHours
  }) => apiFetch("/admin/doctors", { method: "POST", body: input }),

  updateDoctor: (
    doctorId: string,
    input: Partial<{
      specialisation: string
      slotDurationMin: number
      workingHours: WorkingHours
    }>
  ) =>
    apiFetch(`/admin/doctors/${doctorId}`, { method: "PATCH", body: input }),

  addLeave: (doctorId: string, input: { date: string; reason?: string }) =>
    apiFetch<{ affectedCount?: number }>(`/admin/doctors/${doctorId}/leave`, {
      method: "POST",
      body: input,
    }),
}
