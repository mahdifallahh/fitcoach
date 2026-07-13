import "server-only";
import type { PrismaClient } from "@prisma/client";
import { NotFoundException } from "../http/errors";

export class PublicCoachService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Public-page payload for a coach: contact + social + branding. No auth. */
  async getByHandle(handle: string) {
    const profile = await this.prisma.coachProfile.findUnique({
      where: { handle },
      select: {
        handle: true,
        name: true,
        bio: true,
        avatarUrl: true,
        tags: true,
        socialLinks: true,
        cardNumber: true,
        cardHolder: true,
        programPrice: true,
        user: { select: { phone: true, email: true } },
      },
    });
    if (!profile)
      throw new NotFoundException({
        code: "COACH_NOT_FOUND",
        message: "Coach not found",
      });
    return {
      handle: profile.handle,
      name: profile.name,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      tags: profile.tags,
      socialLinks: profile.socialLinks,
      cardNumber: profile.cardNumber,
      cardHolder: profile.cardHolder,
      programPrice: profile.programPrice,
      phone: profile.user.phone,
      email: profile.user.email,
    };
  }
}
