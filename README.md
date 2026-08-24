# Healthcare Appointment & Follow-up Manager

This is my submission for the Healthcare Appointment & Follow-up Manager assignment — a full-stack clinic platform with separate portals for patients, doctors, and admins.

## What it does

Patients can search for doctors, book appointments, and fill in a quick symptom form before their visit. That symptom text gets sent to an LLM (I used Gemini) which returns an urgency level and a few suggested questions for the doctor — so the doctor has some context before the patient even walks in. After the visit, the doctor logs their notes and prescription, and another LLM call turns that into a plain-language summary for the patient, along with a medication schedule.

Admins manage doctor profiles — their specialisation, working hours, and slot length — and can mark a doctor on leave for a day. If a doctor goes on leave and already has bookings for that date, the system automatically cancels those appointments and emails the affected patients.

Everything is backed by email notifications (booking confirmations, cancellations, medication reminders) and Google Calendar sync, so both patient and doctor get the appointment added to their actual calendar.

## Tech stack

- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL (hosted on Supabase)
- **Frontend:** Next.js, React, Tailwind, shadcn/ui
- **LLM:** Gemini 2.5 Flash, for the pre-visit and post-visit summaries
- **Email:** SendGrid via Nodemailer
- **Calendar:** Google Calendar API with OAuth2
- **Auth:** JWT with role-based access (patient / doctor / admin)

## The trickiest part: double-booking

The assignment specifically calls out handling simultaneous booking attempts safely, so I didn't rely on an app-level "check if the slot is free, then book" — that has a race condition if two requests come in at nearly the same time. Instead I put a unique constraint directly on the database (`doctorId` + `slotStart` together must be unique), so even if two people click "book" on the same slot at the same moment, the database itself rejects the second one. I go into more detail on this and the other design decisions in `SYSTEM_DESIGN.md`.

## Project structure

## Running it locally

**Backend:**
```bash
cd backend
npm install
cp .env.example .env   # fill in your own DB, Gemini, SendGrid, Google OAuth keys
npx prisma migrate dev
npm run seed             # creates a test admin + doctor login
npm run dev
```

**Frontend:**
```bash
cd frontend
pnpm install
# create .env.local with:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
pnpm dev
```

Seeded logins after running `npm run seed`:
- Admin: `admin@clinic.com` / `Admin@123`
- Doctor: `dr.sharma@clinic.com` / `Doctor@123`

Full API reference and Google Calendar setup steps are in `backend/README.md` and `backend/openapi.yaml`.

## What I'd add with more time

- A visible "connected" state on the Calendar button (right now it always says "Connect," even after you've connected — it still works, just doesn't reflect status visually)
- SMS fallback for notifications
- Doctor ratings after a completed visit

## Deployed link

*(adding once deployed)*
