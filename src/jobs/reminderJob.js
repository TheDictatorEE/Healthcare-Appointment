const cron = require("node-cron");
const prisma = require("../config/prisma");
const { queueAndSendEmail } = require("../services/emailService");

/**
 * Runs every 15 minutes: finds due, unsent medication reminders and emails them.
 * Marks sent=true only after a successful send attempt is recorded
 * (queueAndSendEmail itself never throws, so this loop always completes).
 */
function startReminderJob() {
  cron.schedule("*/15 * * * *", async () => {
    const due = await prisma.medicationReminder.findMany({
      where: { sent: false, scheduledAt: { lte: new Date() } },
      include: {
        appointment: { include: { patient: true } },
      },
      take: 100, // batch cap so one run can't overload the email provider
    });

    if (!due.length) return;
    console.log(`[reminderJob] Sending ${due.length} medication reminders`);

    for (const reminder of due) {
      const result = await queueAndSendEmail({
        userId: reminder.appointment.patientId,
        appointmentId: reminder.appointmentId,
        type: "MEDICATION_REMINDER",
        to: reminder.appointment.patient.email,
        data: {
          name: reminder.appointment.patient.name,
          medicine: reminder.medicine,
          dosage: reminder.dosage,
        },
      });

      // Mark sent regardless of email success - the notification retry queue
      // (emailRetryJob.js) handles actual delivery retries; this just prevents
      // re-triggering the same reminder over and over.
      await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: { sent: true },
      });

      if (!result.success) {
        console.warn(`[reminderJob] Reminder ${reminder.id} email failed, will retry via emailRetryJob`);
      }
    }
  });

  console.log("[reminderJob] Scheduled: runs every 15 minutes");
}

module.exports = { startReminderJob };
