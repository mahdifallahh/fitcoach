import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  list(coachId: string) {
    return this.redis.remember(cacheKeys.categories(coachId), CACHE_TTL.categories, () =>
      this.prisma.exerciseCategory.findMany({
        where: { coachId },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async create(coachId: string, name: string) {
    try {
      const created = await this.prisma.exerciseCategory.create({ data: { coachId, name } });
      await this.invalidate(coachId);
      return created;
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async rename(coachId: string, id: string, name: string) {
    await this.assertOwned(coachId, id);
    try {
      const updated = await this.prisma.exerciseCategory.update({ where: { id }, data: { name } });
      await this.invalidate(coachId);
      return updated;
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async remove(coachId: string, id: string) {
    await this.assertOwned(coachId, id);
    // Exercises keep existing; their categoryId is set null (onDelete: SetNull).
    await this.prisma.exerciseCategory.delete({ where: { id } });
    await this.invalidate(coachId);
    return { success: true };
  }

  private async assertOwned(coachId: string, id: string) {
    const found = await this.prisma.exerciseCategory.findFirst({ where: { id, coachId } });
    if (!found) throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
  }

  private invalidate(coachId: string) {
    // Exercises embed category info, so refresh both caches.
    return this.redis.invalidate(cacheKeys.categories(coachId), cacheKeys.exercises(coachId));
  }

  private mapError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException({ code: 'CATEGORY_EXISTS', message: 'A category with this name already exists' });
    }
    return e;
  }
}
