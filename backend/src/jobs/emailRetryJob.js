const cron = require("node-cron");
const prisma = require("../config/prisma");
const nodemailer = require("nodemailer");

const MAX_ATTEMPTS = 5;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const TEMPLATES = require("../services/emailTemplates");

/**
 * Runs every 10 minutes. Picks up FAILED notifications under MAX_ATTEMPTS
 * and retries. Notifications that exceed MAX_ATTEMPTS are left as FAILED
 * permanently and should surface on an admin dashboard (not built here,
 * but the query for it is trivial: status=FAILED AND attempts>=MAX_ATTEMPTS).
 */
function startEmailRetryJob() {
  cron.schedule("*/10 * * * *", async () => {
    const failed = await prisma.notification.findMany({
      where: { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } },
      include: { user: true },
      take: 50,
    });

    if (!failed.length) return;
    console.log(`[emailRetryJob] Retrying ${failed.length} failed notifications`);

    for (const notif of failed) {
      try {
        const templateFn = TEMPLATES[notif.type];
        const { subject, text } = templateFn(notif.payload);
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: notif.user.email,
          subject,
          text,
        });
        await prisma.notification.update({
          where: { id: notif.id },
          data: { status: "SENT" },
        });
      } catch (err) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: { attempts: { increment: 1 }, lastError: err.message },
        });
        console.warn(`[emailRetryJob] Retry ${notif.attempts + 1} failed for notification ${notif.id}`);
      }
    }
  });

  console.log("[emailRetryJob] Scheduled: runs every 10 minutes");
}

module.exports = { startEmailRetryJob };
