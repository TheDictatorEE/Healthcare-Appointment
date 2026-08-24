const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Generates candidate slots for a doctor on a given date, based on their
 * workingHours JSON and slotDurationMin, then filters out ones already booked.
 *
 * workingHours shape: { "mon": ["09:00","17:00"], "tue": null, ... }
 * A null/missing entry means the doctor doesn't work that day.
 */
function generateSlotsForDate({ workingHours, slotDurationMin, date, existingBookedTimes, isOnLeave }) {
  if (isOnLeave) return [];

  const dayKey = DAY_KEYS[date.getDay()];
  const hoursForDay = workingHours[dayKey];
  if (!hoursForDay) return [];

  const [startStr, endStr] = hoursForDay;
  const slots = [];

  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  let cursor = new Date(date);
  cursor.setHours(startH, startM, 0, 0);

  const end = new Date(date);
  end.setHours(endH, endM, 0, 0);

  const bookedTimestamps = new Set(existingBookedTimes.map((d) => new Date(d).getTime()));

  while (cursor.getTime() + slotDurationMin * 60000 <= end.getTime()) {
    const slotStart = new Date(cursor);
    if (!bookedTimestamps.has(slotStart.getTime())) {
      const slotEnd = new Date(slotStart.getTime() + slotDurationMin * 60000);
      slots.push({ slotStart, slotEnd });
    }
    cursor = new Date(cursor.getTime() + slotDurationMin * 60000);
  }

  return slots;
}

module.exports = { generateSlotsForDate };
