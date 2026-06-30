import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import { generateUniqueHandle } from '../../common/utils/handle.util';
import { UpdateCoachProfileDto } from './dto/coach-profile.dto';

@Injectable()
export class CoachProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  async get(coachId: string) {
    return this.redis.remember(cacheKeys.coachProfile(coachId), CACHE_TTL.profile, async () => {
      const profile = await this.prisma.coachProfile.findUnique({ where: { userId: coachId } });
      if (!profile) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
      // Back-fill a handle for coaches created before handles existed (e.g. the seed).
      if (!profile.handle) {
        const handle = await this.generateHandle(profile.name);
        return this.prisma.coachProfile.update({ where: { userId: coachId }, data: { handle } });
      }
      return profile;
    });
  }

  async update(coachId: string, dto: UpdateCoachProfileDto) {
    const current = await this.prisma.coachProfile.findUnique({ where: { userId: coachId } });
    if (!current) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });

    const data: Prisma.CoachProfileUpdateInput = {};
    if (dto.handle !== undefined && dto.handle !== current.handle) {
      const taken = await this.prisma.coachProfile.findFirst({
        where: { handle: dto.handle, NOT: { userId: coachId } },
        select: { userId: true },
      });
      if (taken) throw new ConflictException({ code: 'HANDLE_TAKEN', message: 'That public link is already taken' });
      data.handle = dto.handle;
    }
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.socialLinks !== undefined) data.socialLinks = dto.socialLinks as unknown as Prisma.InputJsonValue;
    if (dto.tags !== undefined) data.tags = dto.tags;

    const updated = await this.prisma.coachProfile.update({ where: { userId: coachId }, data });

    // Clean up a replaced avatar.
    if (dto.avatarUrl !== undefined && current.avatarUrl && current.avatarUrl !== dto.avatarUrl) {
      await this.storage.deleteByPublicUrl('avatars', current.avatarUrl);
    }
    // Invalidate own profile + the public page caches (old and new handle).
    const keys = [cacheKeys.coachProfile(coachId)];
    if (current.handle) keys.push(cacheKeys.publicCoach(current.handle));
    if (updated.handle && updated.handle !== current.handle) keys.push(cacheKeys.publicCoach(updated.handle));
    await this.redis.invalidate(...keys);
    return updated;
  }

  private generateHandle(name: string): Promise<string> {
    return generateUniqueHandle(
      name,
      async (h) => (await this.prisma.coachProfile.findUnique({ where: { handle: h }, select: { userId: true } })) !== null,
    );
  }

  avatarUploadUrl(coachId: string, contentType: string) {
    return this.storage.createUploadTarget('avatars', { keyPrefix: coachId, contentType });
  }
}
