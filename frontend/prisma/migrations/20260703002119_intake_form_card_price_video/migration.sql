-- AlterEnum
BEGIN;
CREATE TYPE "ProgramRequestStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
ALTER TABLE "ProgramRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProgramRequest" ALTER COLUMN "status" TYPE "ProgramRequestStatus_new" USING ("status"::text::"ProgramRequestStatus_new");
ALTER TYPE "ProgramRequestStatus" RENAME TO "ProgramRequestStatus_old";
ALTER TYPE "ProgramRequestStatus_new" RENAME TO "ProgramRequestStatus";
DROP TYPE "ProgramRequestStatus_old";
ALTER TABLE "ProgramRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "cardHolder" TEXT,
ADD COLUMN     "cardNumber" TEXT,
ADD COLUMN     "programPrice" INTEGER;

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "ProgramRequest" DROP COLUMN "description",
DROP COLUMN "imageKeys",
DROP COLUMN "injuries",
DROP COLUMN "practiceHistory",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "daysPerWeek" INTEGER,
ADD COLUMN     "declineReason" TEXT,
ADD COLUMN     "medicalHistory" TEXT,
ADD COLUMN     "photoBackKey" TEXT,
ADD COLUMN     "photoFrontKey" TEXT,
ADD COLUMN     "photoSideKey" TEXT,
ADD COLUMN     "receiptKey" TEXT,
ADD COLUMN     "trainingMonths" INTEGER,
ADD COLUMN     "trainingYears" INTEGER;
