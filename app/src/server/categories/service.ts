import 'server-only';
import { Prisma, type PrismaClient } from '@prisma/client';
import { ConflictException, NotFoundException } from '../http/errors';

export class CategoriesService {
  constructor(private readonly prisma: PrismaClient) {}

  list(coachId: string) {
    return this.prisma.exerciseCategory.findMany({
      where: { coachId },
      orderBy: { name: 'asc' },
    });
  }

  async create(coachId: string, name: string) {
    try {
      return await this.prisma.exerciseCategory.create({ data: { coachId, name } });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async rename(coachId: string, id: string, name: string) {
    await this.assertOwned(coachId, id);
    try {
      return await this.prisma.exerciseCategory.update({ where: { id }, data: { name } });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async remove(coachId: string, id: string) {
    await this.assertOwned(coachId, id);
    // Exercises keep existing; their categoryId is set null (onDelete: SetNull).
    await this.prisma.exerciseCategory.delete({ where: { id } });
    return { success: true };
  }

  private async assertOwned(coachId: string, id: string) {
    const found = await this.prisma.exerciseCategory.findFirst({ where: { id, coachId } });
    if (!found) throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
  }

  private mapError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException({ code: 'CATEGORY_EXISTS', message: 'A category with this name already exists' });
    }
    return e;
  }
}
