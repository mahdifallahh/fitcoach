import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';

@Injectable()
export class PublicCoachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Public-page payload for a coach: contact + social + branding. No auth. */
  async getByHandle(handle: string) {
    return this.redis.remember(cacheKeys.publicCoach(handle), CACHE_TTL.publicCoach, async () => {
      const profile = await this.prisma.coachProfile.findUnique({
        where: { handle },
        select: {
          handle: true,
          name: true,
          bio: true,
          avatarUrl: true,
          tags: true,
          socialLinks: true,
          user: { select: { phone: true, email: true } },
        },
      });
      if (!profile) throw new NotFoundException({ code: 'COACH_NOT_FOUND', message: 'Coach not found' });
      return {
        handle: profile.handle,
        name: profile.name,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        tags: profile.tags,
        socialLinks: profile.socialLinks,
        phone: profile.user.phone,
        email: profile.user.email,
      };
    });
  }
}
