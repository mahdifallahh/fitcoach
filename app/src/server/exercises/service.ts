import 'server-only';
import { Prisma, type PrismaClient } from '@prisma/client';
import { StorageService } from '../storage';
import { BadRequestException, NotFoundException } from '../http/errors';
import type { CreateExerciseDto, ListExercisesQueryDto, UpdateExerciseDto } from './schemas';

const exerciseInclude = { category: { select: { id: true, name: true } } } as const;
type ExerciseWithCategory = Prisma.ExerciseGetPayload<{ include: typeof exerciseInclude }>;

export class ExercisesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
  ) {}

  /** Loads the coach's full list, then applies search/category filtering in-memory. */
  async list(coachId: string, query: ListExercisesQueryDto): Promise<ExerciseWithCategory[]> {
    const all = await this.allForCoach(coachId);
    const search = query.search?.trim().toLowerCase();
    return all.filter((ex) => {
      if (query.categoryId && ex.categoryId !== query.categoryId) return false;
      if (search) {
        const haystack = `${ex.name} ${ex.category?.name ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  async get(coachId: string, id: string): Promise<ExerciseWithCategory> {
    const exercise = await this.prisma.exercise.findFirst({
      where: { id, coachId },
      include: exerciseInclude,
    });
    if (!exercise) throw new NotFoundException({ code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found' });
    return exercise;
  }

  async create(coachId: string, dto: CreateExerciseDto) {
    await this.assertCategoryOwned(coachId, dto.categoryId);
    return this.prisma.exercise.create({
      data: {
        coachId,
        name: dto.name,
        categoryId: dto.categoryId ?? null,
        ...(dto.defaultSets !== undefined ? { defaultSets: dto.defaultSets } : {}),
        ...(dto.defaultReps !== undefined ? { defaultReps: dto.defaultReps } : {}),
        description: dto.description ?? null,
        gifUrl: dto.gifUrl ?? null,
        videoUrl: dto.videoUrl ?? null,
      },
      include: exerciseInclude,
    });
  }

  async update(coachId: string, id: string, dto: UpdateExerciseDto) {
    const current = await this.get(coachId, id);
    if (dto.categoryId !== undefined) await this.assertCategoryOwned(coachId, dto.categoryId);

    const data: Prisma.ExerciseUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.defaultSets !== undefined) data.defaultSets = dto.defaultSets;
    if (dto.defaultReps !== undefined) data.defaultReps = dto.defaultReps;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.gifUrl !== undefined) data.gifUrl = dto.gifUrl;
    if (dto.videoUrl !== undefined) data.videoUrl = dto.videoUrl;
    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };
    }

    const updated = await this.prisma.exercise.update({
      where: { id },
      data,
      include: exerciseInclude,
    });

    if (dto.gifUrl !== undefined && current.gifUrl && current.gifUrl !== dto.gifUrl) {
      await this.storage.deleteByPublicUrl('gifs', current.gifUrl);
    }
    return updated;
  }

  async remove(coachId: string, id: string) {
    const current = await this.get(coachId, id);
    await this.prisma.exercise.delete({ where: { id } });
    await this.storage.deleteByPublicUrl('gifs', current.gifUrl);
    return { success: true };
  }

  gifUploadUrl(coachId: string, contentType: string) {
    return this.storage.createUploadTarget('gifs', { keyPrefix: coachId, contentType });
  }

  private allForCoach(coachId: string): Promise<ExerciseWithCategory[]> {
    return this.prisma.exercise.findMany({
      where: { coachId },
      include: exerciseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertCategoryOwned(coachId: string, categoryId?: string | null) {
    if (!categoryId) return;
    const found = await this.prisma.exerciseCategory.findFirst({ where: { id: categoryId, coachId } });
    if (!found) throw new BadRequestException({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
  }
}
