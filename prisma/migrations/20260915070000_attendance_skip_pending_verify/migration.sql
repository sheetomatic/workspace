-- Self punches are Present immediately. Flip leftover pending-verify
-- check-ins (status already Present / half day / short leave) to VERIFIED.
UPDATE "AttendanceRecord"
SET
  "verifyStatus" = 'VERIFIED',
  "verifiedAt" = COALESCE("verifiedAt", "checkInAt", "updatedAt", NOW())
WHERE "verifyStatus" = 'PENDING'
  AND "status" IN ('PRESENT', 'HALF_DAY', 'SHORT_LEAVE');
