CREATE TABLE "GoogleCalendarConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL,
  "filterHash" TEXT NOT NULL,
  "syncToken" TEXT,
  "pageToken" TEXT,
  "fullSyncId" TEXT,
  "leaseId" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  CONSTRAINT "GoogleCalendarConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GoogleCalendarConnection_organizationId_calendarId_key" ON "GoogleCalendarConnection"("organizationId", "calendarId");
CREATE TABLE "GoogleCalendarBooking" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "attendeeName" TEXT,
  "attendeeEmail" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "sourceTimeZone" TEXT,
  "status" TEXT NOT NULL,
  "providerUpdatedAt" TIMESTAMP(3),
  "seenFullSyncId" TEXT,
  "calendarUrl" TEXT,
  "meetUrl" TEXT,
  CONSTRAINT "GoogleCalendarBooking_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GoogleCalendarBooking_connectionId_eventId_key" ON "GoogleCalendarBooking"("connectionId", "eventId");
CREATE INDEX "GoogleCalendarBooking_connectionId_status_startsAt_idx" ON "GoogleCalendarBooking"("connectionId", "status", "startsAt");
