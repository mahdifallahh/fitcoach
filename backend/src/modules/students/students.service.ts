import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProgramStatus, Role, StudentProfile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeIdentifier } from '../../common/utils/identifier.util';

export interface StudentStats {
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

/** Day → exercises include used for the student's calm program viewer. */
const studentProgramInclude = {
  coach: { select: { name: true, avatarUrl: true } },
  days: {
    orderBy: { dayIndex: 'asc' },
    include: {
      exercises: {
        orderBy: [{ order: 'asc' }, { supersetOrder: 'asc' }],
        include: {
          exercise: { select: { id: true, name: true, gifUrl: true, description: true } },
        },
      },
    },
  },
} satisfies Prisma.ProgramInclude;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(coachId: string) {
    return this.prisma.studentProfile.findMany({
      where: { coachId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { programs: true } } },
    });
  }

  /**
   * Find-or-create the coach's StudentProfile for a phone/email contact, updating
   * stats. Also forward-links to an already-registered student account (the
   * reverse — claiming on registration — is handled in UsersService).
   */
  async findOrCreateForProgram(
    coachId: string,
    contact: string,
    stats: StudentStats,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<StudentProfile> {
    const { channel, value } = normalizeIdentifier(contact);
    if (!value || value === '+') {
      throw new BadRequestException({ code: 'CONTACT_REQUIRED', message: 'A phone or email is required' });
    }
    const match = channel === 'EMAIL' ? { email: value } : { phone: value };

    // Link to an existing student account if one already registered with this contact.
    const existingUser = await tx.user.findUnique({ where: match });
    const userId = existingUser?.role === Role.STUDENT ? existingUser.id : undefined;

    const statData = {
      ...(stats.age !== undefined ? { age: stats.age } : {}),
      ...(stats.heightCm !== undefined ? { heightCm: stats.heightCm } : {}),
      ...(stats.weightKg !== undefined ? { weightKg: stats.weightKg } : {}),
    };

    const existing = await tx.studentProfile.findFirst({ where: { coachId, ...match } });
    if (existing) {
      return tx.studentProfile.update({
        where: { id: existing.id },
        data: { ...statData, ...(userId && !existing.userId ? { userId } : {}) },
      });
    }
    return tx.studentProfile.create({
      data: { coachId, ...match, ...statData, ...(userId ? { userId } : {}) },
    });
  }

  // ── Student-facing reads (only PUBLISHED programs; ownership via claimed profile) ──

  /** Coaches who have published ≥1 program for this student, with a program count. */
  async listCoaches(studentUserId: string) {
    const programs = await this.prisma.program.findMany({
      where: { status: ProgramStatus.PUBLISHED, student: { userId: studentUserId } },
      select: {
        coachId: true,
        coach: { select: { name: true, avatarUrl: true, user: { select: { phone: true, email: true } } } },
      },
    });
    const byCoach = new Map<
      string,
      { coachId: string; name: string; avatarUrl: string | null; contact: string; programCount: number }
    >();
    for (const p of programs) {
      const existing = byCoach.get(p.coachId);
      if (existing) {
        existing.programCount++;
      } else {
        byCoach.set(p.coachId, {
          coachId: p.coachId,
          name: p.coach.name,
          avatarUrl: p.coach.avatarUrl,
          contact: p.coach.user.email ?? p.coach.user.phone ?? '',
          programCount: 1,
        });
      }
    }
    return [...byCoach.values()];
  }

  /** Published programs a given coach wrote for this student. */
  listCoachPrograms(studentUserId: string, coachId: string) {
    return this.prisma.program.findMany({
      where: { coachId, status: ProgramStatus.PUBLISHED, student: { userId: studentUserId } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, daysPerWeek: true, updatedAt: true, _count: { select: { days: true } } },
    });
  }

  /** Full program for the calm viewer — must be published and owned by this student. */
  async getProgramForStudent(studentUserId: string, programId: string) {
    const program = await this.prisma.program.findFirst({
      where: { id: programId, status: ProgramStatus.PUBLISHED, student: { userId: studentUserId } },
      include: studentProgramInclude,
    });
    if (!program) throw new NotFoundException({ code: 'PROGRAM_NOT_FOUND', message: 'Program not found' });
    return program;
  }
}
