/**
 * Idempotent dev seed: one coach (on a 15-day trial, pre-activated for demo
 * convenience) with a small exercise library, one *unlinked* student profile
 * (keyed by phone — to be claimed when that phone registers), and a 2-day
 * program containing a superset.
 *
 * Demo identifiers:
 *   Coach   phone  +989120000000
 *   Student phone  +989121111111   (register with this to see the seeded program)
 */
import { PrismaClient, Role, SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const COACH_PHONE = '+989120000000';
const STUDENT_PHONE = '+989121111111';

async function main(): Promise<void> {
  // ── Coach user + profile ───────────────────────────────────────────────────
  const coachUser = await prisma.user.upsert({
    where: { phone: COACH_PHONE },
    update: {},
    create: { phone: COACH_PHONE, role: Role.COACH, locale: 'fa' },
  });

  await prisma.coachProfile.upsert({
    where: { userId: coachUser.id },
    update: {},
    create: {
      userId: coachUser.id,
      name: 'مربی نمونه',
      bio: 'مربی بدنسازی و فیتنس | برنامه‌نویسی تمرینی تخصصی',
      socialLinks: [
        { type: 'instagram', label: 'Instagram', url: 'https://instagram.com/demo_coach' },
        { type: 'telegram', label: 'Telegram', url: 'https://t.me/demo_coach' },
      ],
      tags: ['بدنسازی', 'فیتنس', 'کاهش وزن'],
    },
  });

  // ── Free subscription (permanent, 1 student) ───────────────────────────────
  const existingSub = await prisma.subscription.findFirst({ where: { coachId: coachUser.id } });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        coachId: coachUser.id,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date(),
        endsAt: null,
      },
    });
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  const chest = await prisma.exerciseCategory.upsert({
    where: { coachId_name: { coachId: coachUser.id, name: 'سینه' } },
    update: {},
    create: { coachId: coachUser.id, name: 'سینه' },
  });
  const back = await prisma.exerciseCategory.upsert({
    where: { coachId_name: { coachId: coachUser.id, name: 'پشت' } },
    update: {},
    create: { coachId: coachUser.id, name: 'پشت' },
  });
  const legs = await prisma.exerciseCategory.upsert({
    where: { coachId_name: { coachId: coachUser.id, name: 'پا' } },
    update: {},
    create: { coachId: coachUser.id, name: 'پا' },
  });

  // ── Exercises (create-if-missing by coach+name) ────────────────────────────
  const ensureExercise = async (
    name: string,
    categoryId: string,
    defaultSets: number,
    defaultReps: string,
  ) => {
    const found = await prisma.exercise.findFirst({ where: { coachId: coachUser.id, name } });
    return (
      found ??
      prisma.exercise.create({
        data: { coachId: coachUser.id, categoryId, name, defaultSets, defaultReps },
      })
    );
  };

  const benchPress = await ensureExercise('پرس سینه هالتر', chest.id, 4, '8-12');
  const inclineDumbbell = await ensureExercise('پرس بالا سینه دمبل', chest.id, 3, '10-12');
  const latPulldown = await ensureExercise('زیربغل سیم‌کش', back.id, 4, '10-12');
  const seatedRow = await ensureExercise('قایقی نشسته', back.id, 3, '12');
  const squat = await ensureExercise('اسکوات', legs.id, 4, '8-10');
  const legCurl = await ensureExercise('پشت پا دستگاه', legs.id, 3, '12-15');

  // ── Unlinked student profile (keyed by phone) ──────────────────────────────
  const student = await prisma.studentProfile.upsert({
    where: { coachId_phone: { coachId: coachUser.id, phone: STUDENT_PHONE } },
    update: {},
    create: {
      coachId: coachUser.id,
      phone: STUDENT_PHONE,
      age: 28,
      heightCm: 178,
      weightKg: 82,
    },
  });

  // ── Program (2 days; Day 1 contains a superset) ────────────────────────────
  const existingProgram = await prisma.program.findFirst({
    where: { coachId: coachUser.id, studentProfileId: student.id },
  });
  if (!existingProgram) {
    const supersetId = randomUUID();
    await prisma.program.create({
      data: {
        coachId: coachUser.id,
        studentProfileId: student.id,
        name: 'برنامه حجم - مقدماتی',
        daysPerWeek: 2,
        status: 'PUBLISHED',
        studentAge: student.age,
        studentHeightCm: student.heightCm,
        studentWeightKg: student.weightKg,
        days: {
          create: [
            {
              dayIndex: 1,
              title: 'سینه و پشت',
              exercises: {
                create: [
                  { exerciseId: benchPress.id, sets: 4, reps: '8-12', order: 1 },
                  // Superset: incline dumbbell + lat pulldown
                  {
                    exerciseId: inclineDumbbell.id,
                    sets: 3,
                    reps: '10-12',
                    order: 2,
                    supersetGroupId: supersetId,
                    supersetOrder: 1,
                  },
                  {
                    exerciseId: latPulldown.id,
                    sets: 3,
                    reps: '10-12',
                    order: 2,
                    supersetGroupId: supersetId,
                    supersetOrder: 2,
                  },
                  { exerciseId: seatedRow.id, sets: 3, reps: '12', order: 3 },
                ],
              },
            },
            {
              dayIndex: 2,
              title: 'پا',
              exercises: {
                create: [
                  { exerciseId: squat.id, sets: 4, reps: '8-10', order: 1 },
                  { exerciseId: legCurl.id, sets: 3, reps: '12-15', order: 2 },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log('✅ Seed complete. Coach %s, student %s (unlinked).', COACH_PHONE, STUDENT_PHONE);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
