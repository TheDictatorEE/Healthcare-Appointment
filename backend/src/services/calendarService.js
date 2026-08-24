const { google } = require("googleapis");
const prisma = require("../config/prisma");

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(state) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // needed to get a refresh_token
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state, // pass the userId so callback knows who to attach tokens to
  });
}

async function handleOAuthCallback(code, userId) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });
}

async function getAuthorizedClientForUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.googleRefreshToken) return null; // user hasn't connected Calendar

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });
  return oauth2Client;
}

/**
 * Creates a calendar event for a single user. Returns null (never throws)
 * if the user hasn't connected Calendar or the API call fails -
 * calendar sync is a "nice to have", not something that should block booking.
 */
async function createEventForUser({ userId, summary, description, start, end, attendeeEmail }) {
  try {
    const auth = await getAuthorizedClientForUser(userId);
    if (!auth) return null;

    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        description,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
        reminders: { useDefault: true },
      },
    });
    return res.data.id;
  } catch (err) {
    console.error(`Calendar event creation failed for user ${userId}:`, err.message);
    return null;
  }
}

async function updateEventForUser({ userId, eventId, start, end }) {
  try {
    const auth = await getAuthorizedClientForUser(userId);
    if (!auth || !eventId) return false;
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: {
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });
    return true;
  } catch (err) {
    console.error(`Calendar event update failed for user ${userId}:`, err.message);
    return false;
  }
}

async function deleteEventForUser({ userId, eventId }) {
  try {
    const auth = await getAuthorizedClientForUser(userId);
    if (!auth || !eventId) return false;
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId });
    return true;
  } catch (err) {
    console.error(`Calendar event deletion failed for user ${userId}:`, err.message);
    return false;
  }
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  createEventForUser,
  updateEventForUser,
  deleteEventForUser,
};
