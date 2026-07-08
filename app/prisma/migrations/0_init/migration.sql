-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COACH', 'STUDENT');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'MAGIC_LINK');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('M3', 'M6', 'M12');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('ZARINPAL', 'STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" "Role" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fa',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpToken" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ExerciseCategory" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "defaultSets" INTEGER NOT NULL DEFAULT 3,
    "defaultReps" TEXT NOT NULL DEFAULT '10',
    "description" TEXT,
    "gifUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "coachId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "age" INTEGER,
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "studentAge" INTEGER,
    "studentHeightCm" DOUBLE PRECISION,
    "studentWeightKg" DOUBLE PRECISION,
    "pdfUrl" TEXT,
    "pdfStaleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramDay" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "title" TEXT,

    CONSTRAINT "ProgramDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramExercise" (
    "id" TEXT NOT NULL,
    "programDayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL,
    "supersetGroupId" TEXT,
    "supersetOrder" INTEGER,

    CONSTRAINT "ProgramExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "plan" "SubscriptionPlan",
    "status" "SubscriptionStatus" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "gateway" "PaymentGateway" NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "OtpToken_identifier_idx" ON "OtpToken"("identifier");

-- CreateIndex
CREATE INDEX "OtpToken_expiresAt_idx" ON "OtpToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "ExerciseCategory_coachId_idx" ON "ExerciseCategory"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseCategory_coachId_name_key" ON "ExerciseCategory"("coachId", "name");

-- CreateIndex
CREATE INDEX "Exercise_coachId_categoryId_idx" ON "Exercise"("coachId", "categoryId");

-- CreateIndex
CREATE INDEX "Exercise_coachId_idx" ON "Exercise"("coachId");

-- CreateIndex
CREATE INDEX "StudentProfile_phone_idx" ON "StudentProfile"("phone");

-- CreateIndex
CREATE INDEX "StudentProfile_email_idx" ON "StudentProfile"("email");

-- CreateIndex
CREATE INDEX "StudentProfile_userId_idx" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_coachId_phone_key" ON "StudentProfile"("coachId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_coachId_email_key" ON "StudentProfile"("coachId", "email");

-- CreateIndex
CREATE INDEX "Program_coachId_idx" ON "Program"("coachId");

-- CreateIndex
CREATE INDEX "Program_studentProfileId_idx" ON "Program"("studentProfileId");

-- CreateIndex
CREATE INDEX "ProgramDay_programId_idx" ON "ProgramDay"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramDay_programId_dayIndex_key" ON "ProgramDay"("programId", "dayIndex");

-- CreateIndex
CREATE INDEX "ProgramExercise_programDayId_idx" ON "ProgramExercise"("programDayId");

-- CreateIndex
CREATE INDEX "ProgramExercise_exerciseId_idx" ON "ProgramExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "ProgramExercise_supersetGroupId_idx" ON "ProgramExercise"("supersetGroupId");

-- CreateIndex
CREATE INDEX "Subscription_coachId_status_idx" ON "Subscription"("coachId", "status");

-- CreateIndex
CREATE INDEX "Payment_coachId_idx" ON "Payment"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gateway_reference_key" ON "Payment"("gateway", "reference");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseCategory" ADD CONSTRAINT "ExerciseCategory_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExerciseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramDay" ADD CONSTRAINT "ProgramDay_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExercise" ADD CONSTRAINT "ProgramExercise_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "ProgramDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExercise" ADD CONSTRAINT "ProgramExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

