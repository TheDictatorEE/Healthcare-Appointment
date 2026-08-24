const bcrypt = require("bcryptjs");
const { z } = require("zod");
const prisma = require("../config/prisma");
const { queueAndSendEmail } = require("../services/emailService");
const calendarService = require("../services/calendarService");

const CreateDoctorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  specialisation: z.string().min(2),
  slotDurationMin: z.number().int().positive().default(30),
  workingHours: z.record(z.union([z.tuple([z.string(), z.string()]), z.null()])),
});

async function createDoctor(req, res) {
  const data = CreateDoctorSchema.parse(req.body);

  const passwordHash = await bcrypt.hash(data.password, 10);

  const doctor = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "DOCTOR",
      doctorProfile: {
        create: {
          specialisation: data.specialisation,
          slotDurationMin: data.slotDurationMin,
          workingHours: data.workingHours,
        },
      },
    },
    include: { doctorProfile: true },
  });

  res.status(201).json({ doctor });
}

async function listDoctors(req, res) {
  const doctors = await prisma.doctorProfile.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ doctors });
}

async function updateDoctor(req, res) {
  const { doctorId } = req.params;
  const patch = req.body; // { specialisation?, slotDurationMin?, workingHours? }

  const updated = await prisma.doctorProfile.update({
    where: { id: doctorId },
    data: patch,
  });
  res.json({ doctor: updated });
}

const AddLeaveSchema = z.object({
  date: z.string(), // ISO date
  reason: z.string().optional(),
});

/**
 * Marks a doctor on leave for a date. Any existing BOOKED appointments on that
 * date are cascaded: status doesn't need to change to CANCELLED automatically
 * (business choice - keep as BOOKED but flagged), but every affected patient
 * MUST get an email + calendar event deletion, per the spec.
 */
async function addLeave(req, res) {
  const { doctorId } = req.params;
  const { date, reason } = AddLeaveSchema.parse(req.body);
  const leaveDate = new Date(date);
  const dayStart = new Date(leaveDate.setHours(0, 0, 0, 0));
  const dayEnd = new Date(leaveDate.setHours(23, 59, 59, 999));

  const leave = await prisma.doctorLeave.create({
    data: { doctorId, date: dayStart, reason },
  });

  // Find every booked appointment on that date for this doctor
  const affected = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: "BOOKED",
      slotStart: { gte: dayStart, lte: dayEnd },
    },
    include: { patient: true, doctor: { include: { user: true } } },
  });

  // Cancel each and notify - done sequentially with individual try/catch so
  // one failure doesn't stop the rest of the patients from being notified
  for (const appt of affected) {
    try {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: "CANCELLED", cancelReason: `Doctor on leave: ${reason || "unspecified"}` },
      });

      await queueAndSendEmail({
        userId: appt.patientId,
        appointmentId: appt.id,
        type: "LEAVE_CONFLICT",
        to: appt.patient.email,
        data: { name: appt.patient.name, doctorName: appt.doctor.user.name, slotStart: appt.slotStart },
      });

      if (appt.patientCalendarEventId) {
        await calendarService.deleteEventForUser({
          userId: appt.patientId,
          eventId: appt.patientCalendarEventId,
        });
      }
      if (appt.doctorCalendarEventId) {
        await calendarService.deleteEventForUser({
          userId: appt.doctor.userId,
          eventId: appt.doctorCalendarEventId,
        });
      }
    } catch (err) {
      console.error(`Failed to process leave cancellation for appointment ${appt.id}:`, err.message);
      // continue to next affected patient regardless
    }
  }

  res.status(201).json({ leave, affectedCount: affected.length });
}

module.exports = { createDoctor, listDoctors, updateDoctor, addLeave };
