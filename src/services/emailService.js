const nodemailer = require("nodemailer");
const prisma = require("../config/prisma");
const TEMPLATES = require("./emailTemplates");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

/**
 * Creates a Notification row FIRST (status PENDING), then attempts to send.
 * This means even if the process crashes mid-send, the retry job (see jobs/emailRetryJob.js)
 * will pick it up later. Never fire-and-forget an email without a DB record.
 */
async function queueAndSendEmail({ userId, appointmentId, type, to, data }) {
  const notification = await prisma.notification.create({
    data: { userId, appointmentId, type, payload: data, status: "PENDING" },
  });

  try {
    const { subject, text } = TEMPLATES[type](data);
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });

    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "SENT" },
    });
    return { success: true };
  } catch (err) {
    console.error(`Email send failed [${type}] to ${to}:`, err.message);
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "FAILED", attempts: { increment: 1 }, lastError: err.message },
    });
    // Don't throw - a failed email must never break the booking/cancellation flow.
    // The retry job will pick this up from the FAILED queue.
    return { success: false, error: err.message };
  }
}

module.exports = { queueAndSendEmail };
