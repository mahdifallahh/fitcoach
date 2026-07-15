import "server-only";
import { Prisma, ProgramStatus, type PrismaClient } from "@prisma/client";
import { ProgramsService } from "../programs/service";
import { BadRequestException, NotFoundException } from "../http/errors";
import type { ProgramDayInputDto } from "../programs/schemas";
import type {
  AssignTemplateDto,
  CreateTemplateDto,
  ListTemplatesQueryDto,
  UpdateTemplateDto,
} from "./schemas";

const fullInclude = {
  days: {
    orderBy: { dayIndex: "asc" },
    include: {
      exercises: {
        orderBy: [{ order: "asc" }, { supersetOrder: "asc" }],
        include: {
          exercise: {
            select: {
              id: true,
              name: true,
              gifUrl: true,
              videoUrl: true,
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
} satisfies Prisma.ProgramTemplateInclude;

type TemplateWithDays = Prisma.ProgramTemplateGetPayload<{
  include: typeof fullInclude;
}>;

export class ProgramTemplatesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly programs: ProgramsService,
  ) {}

  list(coachId: string, query: ListTemplatesQueryDto = {}) {
    const search = query.search?.trim();
    return this.prisma.programTemplate.findMany({
      where: {
        coachId,
        ...(search
          ? { name: { contains: search, mode: "insensitive" } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { days: true } } },
    });
  }

  async get(coachId: string, id: string): Promise<TemplateWithDays> {
    const template = await this.prisma.programTemplate.findFirst({
      where: { id, coachId },
      include: fullInclude,
    });
    if (!template)
      throw new NotFoundException({
        code: "TEMPLATE_NOT_FOUND",
        message: "Template not found",
      });
    return template;
  }

  async create(coachId: string, dto: CreateTemplateDto) {
    await this.assertExercisesOwned(coachId, dto.days);

    const created = await this.prisma.programTemplate.create({
      data: {
        coachId,
        name: dto.name,
        description: dto.description ?? null,
        daysPerWeek: dto.daysPerWeek,
        days: this.buildDaysCreate(dto.days),
      },
    });
    return this.get(coachId, created.id);
  }

  async update(coachId: string, id: string, dto: UpdateTemplateDto) {
    await this.assertOwned(coachId, id);
    if (dto.days) await this.assertExercisesOwned(coachId, dto.days);

    await this.prisma.$transaction(async (tx) => {
      if (dto.days) {
        // Replace strategy: drop existing days (cascades to exercises) + recreate.
        await tx.templateDay.deleteMany({ where: { templateId: id } });
      }
      await tx.programTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.daysPerWeek !== undefined
            ? { daysPerWeek: dto.daysPerWeek }
            : {}),
          ...(dto.days ? { days: this.buildDaysCreate(dto.days) } : {}),
        },
      });
    });

    return this.get(coachId, id);
  }

  async remove(coachId: string, id: string) {
    await this.assertOwned(coachId, id);
    await this.prisma.programTemplate.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Materialize a real Program for a student from this template. Delegates to
   * ProgramsService so student find-or-create, exercise-ownership checks, and
   * the request-accept side effect all behave exactly like a hand-built program.
   */
  async assign(coachId: string, id: string, dto: AssignTemplateDto) {
    const template = await this.get(coachId, id);
    return this.programs.create(coachId, {
      studentContact: dto.studentContact,
      name: dto.name?.trim() || template.name,
      daysPerWeek: template.daysPerWeek,
      age: dto.age,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      status: dto.status ?? ProgramStatus.DRAFT,
      requestId: dto.requestId,
      days: template.days.map((d) => ({
        dayIndex: d.dayIndex,
        title: d.title ?? undefined,
        exercises: d.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          notes: e.notes ?? undefined,
          order: e.order,
          supersetGroupId: e.supersetGroupId ?? undefined,
          supersetOrder: e.supersetOrder ?? undefined,
        })),
      })),
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private buildDaysCreate(
    days: ProgramDayInputDto[],
  ): Prisma.TemplateDayCreateNestedManyWithoutTemplateInput {
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
    const found = await this.prisma.programTemplate.findFirst({
      where: { id, coachId },
      select: { id: true },
    });
    if (!found)
      throw new NotFoundException({
        code: "TEMPLATE_NOT_FOUND",
        message: "Template not found",
      });
  }

  private async assertExercisesOwned(
    coachId: string,
    days: ProgramDayInputDto[],
  ) {
    const ids = [
      ...new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId))),
    ];
    if (ids.length === 0) return;
    const owned = await this.prisma.exercise.count({
      where: { id: { in: ids }, coachId },
    });
    if (owned !== ids.length) {
      throw new BadRequestException({
        code: "EXERCISE_NOT_OWNED",
        message: "One or more exercises do not belong to you",
      });
    }
  }
}
