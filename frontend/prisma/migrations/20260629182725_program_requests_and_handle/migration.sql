-- CreateEnum
CREATE TYPE "ProgramRequestStatus" AS ENUM ('PENDING', 'REVIEWED', 'DECLINED');

-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "handle" TEXT;

-- CreateTable
CREATE TABLE "ProgramRequest" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "practiceHistory" TEXT,
    "injuries" TEXT,
    "description" TEXT,
    "imageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ProgramRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProgramRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramRequest_coachId_status_idx" ON "ProgramRequest"("coachId", "status");

-- CreateIndex
CREATE INDEX "ProgramRequest_studentUserId_idx" ON "ProgramRequest"("studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_handle_key" ON "CoachProfile"("handle");

-- AddForeignKey
ALTER TABLE "ProgramRequest" ADD CONSTRAINT "ProgramRequest_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRequest" ADD CONSTRAINT "ProgramRequest_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
