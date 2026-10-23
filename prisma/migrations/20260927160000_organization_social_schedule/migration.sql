-- Social content calendar. Present on the Prisma model, missing from earlier migrations.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "socialSchedule" JSONB;
