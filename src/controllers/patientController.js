const { z } = require("zod");
const prisma = require("../config/prisma");
const { generateSlotsForDate } = require("../utils/slotGenerator");
const { generatePreVisitSummary } = require("../services/llmService");
const { queueAndSendEmail } = require("../services/emailService");
const calendarService = require("../services/calendarService");

async function searchDoctors(req, res) {
  const { specialisation } = req.query;
  const doctors = await prisma.doctorProfile.findMany({
    where: specialisation ? { specialisation: { contains: specialisation, mode: "insensitive" } } : {},
    include: { user: { select: { id: true, name: true } } },
  });
  res.json({ doctors });
}

async function getAvailableSlots(req, res) {
  const { doctorId } = req.params;
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: "date query param required" });

  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });

  const targetDate = new Date(date);
  const dayStart = new Date(targetDate.setHours(0, 0, 0, 0));
  const dayEnd = new Date(new Date(date).setHours(23, 59, 59, 999));

  const [leave, bookedAppointments] = await Promise.all([
    prisma.doctorLeave.findFirst({ where: { doctorId, date: dayStart } }),
    prisma.appointment.findMany({
      where: { doctorId, status: "BOOKED", slotStart: { gte: dayStart, lte: dayEnd } },
      select: { slotStart: true },
    }),
  ]);

  const slots = generateSlotsForDate({
    workingHours: doctor.workingHours,
    slotDurationMin: doctor.slotDurationMin,
    date: new Date(date),
    existingBookedTimes: bookedAppointments.map((a) => a.slotStart),
    isOnLeave: !!leave,
  });

  res.json({ slots, onLeave: !!leave });
}

const BookSchema = z.object({
  doctorId: z.string(),
  slotStart: z.string(), // ISO datetime
  symptoms: z.string().min(3),
});

/**
 * Books an appointment. Double-booking prevention strategy:
 * 1. DB-level unique constraint on (doctorId, slotStart) - the real guarantee.
 * 2. Wrapped in a transaction so the booking + LLM-triggered fields are atomic.
 * If two requests race for the same slot, the second INSERT throws Prisma's
 * P2002 unique violation, which errorHandler.js converts into a clean 409.
 * This is safe under concurrent requests, unlike an app-level "check then insert".
 */
async function bookAppointment(req, res) {
  const { doctorId, slotStart, symptoms } = BookSchema.parse(req.body);
  const patientId = req.user.id;

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });

  const start = new Date(slotStart);
  const end = new Date(start.getTime() + doctor.slotDurationMin * 60000);

  // Get LLM pre-visit summary BEFORE the transaction (LLM call shouldn't hold a DB lock)
  const llmResult = await generatePreVisitSummary(symptoms);

  // The actual atomic booking - unique constraint does the heavy lifting
  const appointment = await prisma.appointment.create({
    data: {
      patientId,
      doctorId,
      slotStart: start,
      slotEnd: end,
      symptoms,
      preVisitSummary: llmResult.data,
      urgencyLevel: llmResult.data.urgencyLevel.toUpperCase(),
      preVisitLlmFailed: !llmResult.success,
    },
  });
  // NOTE: if this throws P2002 (slot taken between check and create), errorHandler.js
  // returns 409 automatically - see middleware/errorHandler.js

  const patient = await prisma.user.findUnique({ where: { id: patientId } });

  // Email confirmations - best effort, never blocks the response
  await queueAndSendEmail({
    userId: patientId,
    appointmentId: appointment.id,
    type: "BOOKING_CONFIRMATION",
    to: patient.email,
    data: { name: patient.name, doctorName: doctor.user.name, slotStart: start },
  });
  await queueAndSendEmail({
    userId: doctor.userId,
    appointmentId: appointment.id,
    type: "BOOKING_CONFIRMATION",
    to: doctor.user.email,
    data: { name: doctor.user.name, doctorName: doctor.user.name, slotStart: start },
  });

  // Calendar events - best effort (returns null if not connected, never throws)
  const patientEventId = await calendarService.createEventForUser({
    userId: patientId,
    summary: `Appointment with Dr. ${doctor.user.name}`,
    description: "Booked via Healthcare Appointment Manager",
    start,
    end,
    attendeeEmail: doctor.user.email,
  });
  const doctorEventId = await calendarService.createEventForUser({
    userId: doctor.userId,
    summary: `Appointment with ${patient.name}`,
    description: `Chief complaint: ${llmResult.data.chiefComplaint}`,
    start,
    end,
    attendeeEmail: patient.email,
  });

  if (patientEventId || doctorEventId) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { patientCalendarEventId: patientEventId, doctorCalendarEventId: doctorEventId },
    });
  }

  res.status(201).json({ appointment });
}

async function myAppointments(req, res) {
  const appointments = await prisma.appointment.findMany({
    where: { patientId: req.user.id },
    include: { doctor: { include: { user: { select: { name: true } } } } },
    orderBy: { slotStart: "desc" },
  });
  res.json({ appointments });
}

async function cancelAppointment(req, res) {
  const { appointmentId } = req.params;
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: { include: { user: true } } },
  });

  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  if (appointment.patientId !== req.user.id) return res.status(403).json({ error: "Not your appointment" });
  if (appointment.status !== "BOOKED") return res.status(400).json({ error: "Only booked appointments can be cancelled" });

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED", cancelReason: "Cancelled by patient" },
  });

  await queueAndSendEmail({
    userId: appointment.patientId,
    appointmentId: appointment.id,
    type: "CANCELLATION",
    to: appointment.patient.email,
    data: { name: appointment.patient.name, doctorName: appointment.doctor.user.name, slotStart: appointment.slotStart },
  });

  if (appointment.patientCalendarEventId) {
    await calendarService.deleteEventForUser({ userId: appointment.patientId, eventId: appointment.patientCalendarEventId });
  }
  if (appointment.doctorCalendarEventId) {
    await calendarService.deleteEventForUser({ userId: appointment.doctor.userId, eventId: appointment.doctorCalendarEventId });
  }

  res.json({ message: "Appointment cancelled" });
}

module.exports = { searchDoctors, getAvailableSlots, bookAppointment, myAppointments, cancelAppointment };
