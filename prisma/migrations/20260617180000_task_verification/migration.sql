-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'AWAITING_VERIFICATION';

-- AlterTable
ALTER TABLE "DelegatedTask" ADD COLUMN "proofSubmittedAt" TIMESTAMP(3),
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "verifiedById" TEXT;

-- AddForeignKey
ALTER TABLE "DelegatedTask" ADD CONSTRAINT "DelegatedTask_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
