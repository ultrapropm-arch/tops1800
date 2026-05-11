import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

export async function createCalendarEvent({
  title,
  description,
  location,
  startDateTime,
  endDateTime,
}: {
  title: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
}) {
  const authClient = await auth.getClient();

  const calendar = google.calendar({
    version: "v3",
    auth: authClient as any,
  });

  return calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    requestBody: {
      summary: title,
      description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone: "America/Toronto",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "America/Toronto",
      },
    },
  });
}