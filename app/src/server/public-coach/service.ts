import "server-only";
import type { PrismaClient } from "@prisma/client";
import { NotFoundException } from "../http/errors";

/** Hard cap on the public directory so the landing page can't balloon. */
const DIRECTORY_LIMIT = 24;

export class PublicCoachService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Public coach directory for the landing page. **Privacy-critical:** a coach's
   * default `name` is their raw phone number (see `defaultCoachName` in
   * users/service.ts), so listing everyone would publish phone numbers. Only
   * "presentable" profiles are returned — a public handle, at least one piece of
   * real profile content (avatar / bio / tags), and a name the coach actually
   * chose. The name check can't be done in SQL (column-to-column compare), so it
   * is applied in JS as a second guard after the content filter.
   */
  async listPublic() {
    const rows = await this.prisma.coachProfile.findMany({
      where: {
        handle: { not: null },
        OR: [
          { avatarUrl: { not: null } },
          { bio: { not: null } },
          { NOT: { tags: { isEmpty: true } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: DIRECTORY_LIMIT * 2, // over-fetch: the name guard below drops some
      select: {
        handle: true,
        name: true,
        bio: true,
        avatarUrl: true,
        tags: true,
        user: { select: { phone: true, email: true } },
      },
    });

    return rows
      .filter((c) => {
        const name = c.name.trim();
        // Drop profiles still carrying the auto-assigned identifier as a name.
        if (!name) return false;
        return name !== c.user.phone && name !== c.user.email;
      })
      .slice(0, DIRECTORY_LIMIT)
      .map((c) => ({
        handle: c.handle,
        name: c.name,
        bio: c.bio,
        avatarUrl: c.avatarUrl,
        tags: c.tags,
      }));
  }

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
