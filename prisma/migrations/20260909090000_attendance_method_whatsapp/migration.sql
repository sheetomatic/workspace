-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "AttendanceMethod" ADD VALUE 'WHATSAPP';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
