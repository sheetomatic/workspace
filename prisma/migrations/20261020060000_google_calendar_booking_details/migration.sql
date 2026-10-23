ALTER TABLE "GoogleCalendarBooking"
  ADD COLUMN IF NOT EXISTS "attendeePhone" TEXT,
  ADD COLUMN IF NOT EXISTS "bookingNotes" TEXT;
