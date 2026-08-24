const { z } = require("zod");
const prisma = require("../config/prisma");
const { generatePostVisitSummary } = require("../services/llmService");
const { queueAndSendEmail } = require("../services/emailService");

// Doctor's own appointments, most urgent first for today's queue
async function myAppointments(req, res) {
  const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: req.user.id } });
  if (!doctorProfile) return res.status(404).json({ error: "Doctor profile not found" });

  const { date } = req.query;
  const where = { doctorId: doctorProfile.id, status: "BOOKED" };
  if (date) {
    const dayStart = new Date(new Date(date).setHours(0, 0, 0, 0));
    const dayEnd = new Date(new Date(date).setHours(23, 59, 59, 999));
    where.slotStart = { gte: dayStart, lte: dayEnd };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { patient: { select: { name: true, email: true, phone: true } } },
    orderBy: [{ slotStart: "asc" }],
  });

  // Sort urgency-high-first within same-day queue (small feature: urgency-based sorting)
  const urgencyRank = { HIGH: 0, MEDIUM: 1, LOW: 2, null: 3 };
  appointments.sort((a, b) => (urgencyRank[a.urgencyLevel] ?? 3) - (urgencyRank[b.urgencyLevel] ?? 3));

  res.json({ appointments });
}

const NotesSchema = z.object({
  clinicalNotes: z.string().min(3),
  prescription: z
    .array(
      z.object({
        medicine: z.string(),
        dosage: z.string(),
        frequency: z.string(), // e.g. "twice daily"
        durationDays: z.number().int().positive(),
      })
    )
    .default([]),
});

/**
 * Doctor submits post-visit notes -> LLM generates patient-friendly summary
 * -> appointment marked COMPLETED -> medication reminders scheduled based on
 * prescription frequency (picked up by the cron job in jobs/reminderJob.js).
 */
async function submitPostVisit(req, res) {
  const { appointmentId } = req.params;
  const { clinicalNotes, prescription } = NotesSchema.parse(req.body);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: { include: { user: true } } },
  });
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });

  const llmResult = await generatePostVisitSummary(
    `${clinicalNotes}\nPrescription: ${JSON.stringify(prescription)}`
  );

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      clinicalNotes,
      prescription,
      postVisitSummary: llmResult.data,
      postVisitLlmFailed: !llmResult.success,
      status: "COMPLETED",
    },
  });

  // Schedule medication reminders: simple frequency parsing (extendable)
  const reminders = [];
  for (const med of prescription) {
    const timesPerDay = parseFrequencyToTimesPerDay(med.frequency);
    for (let day = 0; day < med.durationDays; day++) {
      for (let t = 0; t < timesPerDay; t++) {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + day);
        scheduledAt.setHours(9 + t * Math.floor(12 / timesPerDay), 0, 0, 0); // spread across the day
        reminders.push({
          appointmentId,
          medicine: med.medicine,
          dosage: med.dosage,
          scheduledAt,
        });
      }
    }
  }
  if (reminders.length) {
    await prisma.medicationReminder.createMany({ data: reminders });
  }

  await queueAndSendEmail({
    userId: appointment.patientId,
    appointmentId,
    type: "REMINDER",
    to: appointment.patient.email,
    data: { name: appointment.patient.name, doctorName: appointment.doctor.user.name, slotStart: appointment.slotStart },
  });

  res.json({ appointment: updated });
}

function parseFrequencyToTimesPerDay(frequency) {
  const f = frequency.toLowerCase();
  if (f.includes("once")) return 1;
  if (f.includes("twice")) return 2;
  if (f.includes("thrice") || f.includes("three")) return 3;
  if (f.includes("four")) return 4;
  return 1; // safe default
}

async function markNoShow(req, res) {
  const { appointmentId } = req.params;
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "NO_SHOW" },
  });
  res.json({ appointment: updated });
}

module.exports = { myAppointments, submitPostVisit, markNoShow };
