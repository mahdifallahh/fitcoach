import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProgramStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import {
  CreateProgramDto,
  ProgramDayInputDto,
  UpdateProgramDto,
} from './dto/program.dto';

const fullInclude = {
  student: {
    select: { id: true, phone: true, email: true, age: true, heightCm: true, weightKg: true, userId: true },
  },
  days: {
    orderBy: { dayIndex: 'asc' },
    include: {
      exercises: {
        orderBy: [{ order: 'asc' }, { supersetOrder: 'asc' }],
        include: {
          exercise: {
            select: {
              id: true,
              name: true,
              gifUrl: true,
              defaultSets: true,
              defaultReps: true,
              description: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProgramInclude;

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
  ) {}

  list(coachId: string) {
    return this.prisma.program.findMany({
      where: { coachId },
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { phone: true, email: true } },
        _count: { select: { days: true } },
      },
    });
  }

  async get(coachId: string, id: string) {
    const program = await this.prisma.program.findFirst({
      where: { id, coachId },
      include: fullInclude,
    });
    if (!program) throw new NotFoundException({ code: 'PROGRAM_NOT_FOUND', message: 'Program not found' });
    return program;
  }

  async create(coachId: string, dto: CreateProgramDto) {
    await this.assertExercisesOwned(coachId, dto.days);

    const program = await this.prisma.$transaction(async (tx) => {
      const student = await this.students.findOrCreateForProgram(
        coachId,
        dto.studentContact,
        { age: dto.age, heightCm: dto.heightCm, weightKg: dto.weightKg },
        tx,
      );
      return tx.program.create({
        data: {
          coachId,
          studentProfileId: student.id,
          name: dto.name,
          daysPerWeek: dto.daysPerWeek,
          status: dto.status ?? ProgramStatus.DRAFT,
          studentAge: dto.age ?? student.age ?? null,
          studentHeightCm: dto.heightCm ?? student.heightCm ?? null,
          studentWeightKg: dto.weightKg ?? student.weightKg ?? null,
          days: this.buildDaysCreate(dto.days),
        },
      });
    });

    return this.get(coachId, program.id);
  }

  async update(coachId: string, id: string, dto: UpdateProgramDto) {
    await this.assertOwned(coachId, id);
    if (dto.days) await this.assertExercisesOwned(coachId, dto.days);

    await this.prisma.$transaction(async (tx) => {
      if (dto.days) {
        // Replace strategy: drop existing days (cascades to exercises) then recreate.
        await tx.programDay.deleteMany({ where: { programId: id } });
      }
      await tx.program.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.daysPerWeek !== undefined ? { daysPerWeek: dto.daysPerWeek } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.age !== undefined ? { studentAge: dto.age } : {}),
          ...(dto.heightCm !== undefined ? { studentHeightCm: dto.heightCm } : {}),
          ...(dto.weightKg !== undefined ? { studentWeightKg: dto.weightKg } : {}),
          pdfStaleAt: new Date(), // content changed → PDF must be regenerated
          ...(dto.days ? { days: this.buildDaysCreate(dto.days) } : {}),
        },
      });
    });

    return this.get(coachId, id);
  }

  async setStatus(coachId: string, id: string, status: ProgramStatus) {
    await this.assertOwned(coachId, id);
    await this.prisma.program.update({ where: { id }, data: { status } });
    return this.get(coachId, id);
  }

  async remove(coachId: string, id: string) {
    await this.assertOwned(coachId, id);
    await this.prisma.program.delete({ where: { id } });
    return { success: true };
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private buildDaysCreate(days: ProgramDayInputDto[]): Prisma.ProgramDayCreateNestedManyWithoutProgramInput {
    return {
      create: days.map((d) => ({
        dayIndex: d.dayIndex,
        title: d.title ?? null,
        exercises: {
          create: d.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            reps: e.reps,
            notes: e.notes ?? null,
            order: e.order,
            supersetGroupId: e.supersetGroupId ?? null,
            supersetOrder: e.supersetOrder ?? null,
          })),
        },
      })),
    };
  }

  private async assertOwned(coachId: string, id: string) {
    const found = await this.prisma.program.findFirst({ where: { id, coachId }, select: { id: true } });
    if (!found) throw new NotFoundException({ code: 'PROGRAM_NOT_FOUND', message: 'Program not found' });
  }

  private async assertExercisesOwned(coachId: string, days: ProgramDayInputDto[]) {
    const ids = [...new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))];
    if (ids.length === 0) return;
    const owned = await this.prisma.exercise.count({ where: { id: { in: ids }, coachId } });
    if (owned !== ids.length) {
      throw new BadRequestException({
        code: 'EXERCISE_NOT_OWNED',
        message: 'One or more exercises do not belong to you',
      });
    }
  }
}
