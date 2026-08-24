const TEMPLATES = {
  BOOKING_CONFIRMATION: ({ name, doctorName, slotStart }) => ({
    subject: "Appointment Confirmed",
    text: `Hi ${name}, your appointment with Dr. ${doctorName} on ${new Date(
      slotStart
    ).toLocaleString()} is confirmed.`,
  }),
  REMINDER: ({ name, doctorName, slotStart }) => ({
    subject: "Appointment Reminder",
    text: `Hi ${name}, reminder: your appointment with Dr. ${doctorName} is at ${new Date(
      slotStart
    ).toLocaleString()}.`,
  }),
  CANCELLATION: ({ name, doctorName, slotStart, reason }) => ({
    subject: "Appointment Cancelled",
    text: `Hi ${name}, your appointment with Dr. ${doctorName} on ${new Date(
      slotStart
    ).toLocaleString()} has been cancelled.${reason ? " Reason: " + reason : ""}`,
  }),
  LEAVE_CONFLICT: ({ name, doctorName, slotStart }) => ({
    subject: "Your Appointment Needs Rescheduling",
    text: `Hi ${name}, Dr. ${doctorName} is unavailable on ${new Date(
      slotStart
    ).toLocaleDateString()}. Please rebook at your earliest convenience. We're sorry for the inconvenience.`,
  }),
  MEDICATION_REMINDER: ({ name, medicine, dosage }) => ({
    subject: "Medication Reminder",
    text: `Hi ${name}, it's time to take your medication: ${medicine} (${dosage}).`,
  }),
};

module.exports = TEMPLATES;
