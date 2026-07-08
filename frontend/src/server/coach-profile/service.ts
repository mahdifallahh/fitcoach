import 'server-only';
import { Prisma, type PrismaClient } from '@prisma/client';
import { StorageService } from '../storage';
import { generateUniqueHandle } from '../utils/handle';
import { ConflictException, NotFoundException } from '../http/errors';
import type { UpdateCoachProfileDto } from './schemas';

export class CoachProfileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
  ) {}

  async get(coachId: string) {
    const profile = await this.prisma.coachProfile.findUnique({ where: { userId: coachId } });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
    // Back-fill a handle for coaches created before handles existed (e.g. the seed).
    if (!profile.handle) {
      const handle = await this.generateHandle(profile.name);
      return this.prisma.coachProfile.update({ where: { userId: coachId }, data: { handle } });
    }
    return profile;
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
    if (dto.cardNumber !== undefined) data.cardNumber = dto.cardNumber;
    if (dto.cardHolder !== undefined) data.cardHolder = dto.cardHolder;
    if (dto.programPrice !== undefined) data.programPrice = dto.programPrice;

    const updated = await this.prisma.coachProfile.update({ where: { userId: coachId }, data });

    // Clean up a replaced avatar.
    if (dto.avatarUrl !== undefined && current.avatarUrl && current.avatarUrl !== dto.avatarUrl) {
      await this.storage.deleteByPublicUrl('avatars', current.avatarUrl);
    }
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
