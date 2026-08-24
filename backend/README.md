# Healthcare Appointment & Follow-up Manager — Backend

## 1. Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, GEMINI_API_KEY, SMTP creds, Google OAuth creds
npx prisma migrate dev --name init
npm run seed            # creates admin + one sample doctor
npm run dev              # starts on http://localhost:5000
```

### Getting each credential (all free)
- **Postgres**: free instance on [Supabase](https://supabase.com), [Render](https://render.com), [Neon](https://neon.tech), or Azure PG (Students).
- **Gemini API key**: [aistudio.google.com](https://aistudio.google.com) → Get API Key. No card required.
- **SMTP**: SendGrid free tier (100 emails/day) → create an API key, use `apikey` as SMTP_USER.
- **Google Calendar OAuth2**: see section 5 below.

Default seeded logins:
- Admin: `admin@clinic.com` / `Admin@123`
- Doctor: `dr.sharma@clinic.com` / `Doctor@123`
- Patients self-register via `POST /api/auth/register`

## 2. Tech Stack
Node.js + Express, PostgreSQL + Prisma ORM, JWT auth (role-based: PATIENT/DOCTOR/ADMIN), Gemini 2.5 Flash for LLM summaries, Nodemailer (SMTP) for email, Google Calendar API v3 with OAuth2, node-cron for background jobs.

## 3. Database Schema (see `prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `User` | All roles (patient/doctor/admin) in one table with a `role` enum. Holds Google OAuth tokens. |
| `DoctorProfile` | 1:1 with a DOCTOR user. Specialisation, slot duration, `workingHours` JSON. |
| `DoctorLeave` | One row per leave day. Unique on `(doctorId, date)`. |
| `Appointment` | Core entity. **`@@unique([doctorId, slotStart])`** is the double-booking guard. Stores pre-visit and post-visit LLM output as JSON, plus `*LlmFailed` booleans for observability. |
| `MedicationReminder` | Generated from prescription frequency at post-visit submission; polled by cron. |
| `Notification` | Every email attempt (any type) is logged here with `status` (PENDING/SENT/FAILED) and `attempts` — this is what makes email retry possible. |

## 4. API Reference

### Auth (`/api/auth`)
| Method | Route | Auth | Body |
|---|---|---|---|
| POST | `/register` | none | `{ name, email, password, phone? }` → patient account |
| POST | `/login` | none | `{ email, password }` |
| GET | `/me` | any | — |
| GET | `/google/connect` | any | returns `{ url }` to redirect user to Google consent |
| GET | `/google/callback` | none (Google redirect) | — |

### Admin (`/api/admin`) — role: ADMIN
| Method | Route | Body |
|---|---|---|
| POST | `/doctors` | `{ name, email, password, specialisation, slotDurationMin, workingHours }` |
| GET | `/doctors` | — |
| PATCH | `/doctors/:doctorId` | partial doctor profile fields |
| POST | `/doctors/:doctorId/leave` | `{ date, reason? }` — cascades cancellations + notifications |

### Patient (`/api/patient`) — role: PATIENT
| Method | Route | Notes |
|---|---|---|
| GET | `/doctors?specialisation=` | search |
| GET | `/doctors/:doctorId/slots?date=YYYY-MM-DD` | returns open slots for that day |
| POST | `/appointments` | `{ doctorId, slotStart, symptoms }` — rate-limited 10/min |
| GET | `/appointments` | patient's own bookings |
| POST | `/appointments/:id/cancel` | — |

### Doctor (`/api/doctor`) — role: DOCTOR
| Method | Route | Notes |
|---|---|---|
| GET | `/appointments?date=` | today's queue, sorted urgency-first |
| POST | `/appointments/:id/complete` | `{ clinicalNotes, prescription: [{medicine,dosage,frequency,durationDays}] }` |
| POST | `/appointments/:id/no-show` | — |

All protected routes require `Authorization: Bearer <token>`.

## 5. Google Calendar Setup
1. [Google Cloud Console](https://console.cloud.google.com) → new project → enable **Google Calendar API**.
2. OAuth consent screen → External → add your test users (your own Gmail) while in testing mode.
3. Credentials → Create OAuth Client ID → Web application → Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`.
4. Copy Client ID/Secret into `.env`.
5. In the app, each user (patient or doctor) hits `GET /api/auth/google/connect`, is redirected to Google, grants access → tokens stored on their `User` row. Calendar events are then created automatically on booking.

## 6. LLM Prompts (exact, from `src/services/llmService.js`)

**Pre-visit:**
> Analyse these symptoms and return ONLY valid JSON: `{ urgencyLevel: "Low"|"Medium"|"High", chiefComplaint, suggestedQuestions[] }`

**Post-visit:**
> Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps, returned as JSON.

Both use `responseMimeType: "application/json"` (Gemini JSON mode) and are validated with Zod after parsing. On any failure (bad JSON, API error, timeout), a safe fallback object is returned and `preVisitLlmFailed`/`postVisitLlmFailed` is set `true` on the Appointment — the booking/visit flow never breaks.

## 7. Background Jobs
- **`reminderJob.js`** — every 15 min, sends due medication reminders.
- **`emailRetryJob.js`** — every 10 min, retries `FAILED` notifications up to 5 attempts.

## 8. Frontend
Not included here — build with your own React app or generate one with an AI site builder (v0.dev, bolt.new, lovable.dev) using the API reference above as the contract. Three views needed: Patient portal, Doctor portal, Admin portal, gated by the `role` in the JWT payload returned from login.
