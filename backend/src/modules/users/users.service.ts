import { Injectable } from '@nestjs/common';
import { Prisma, Role, SubscriptionStatus, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IdentifierChannel } from '../../common/utils/identifier.util';

export const TRIAL_DAYS = 7;

interface CreateUserInput {
  identifier: string; // normalized
  channel: IdentifierChannel;
  role: Role;
  locale?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByIdentifier(value: string, channel: IdentifierChannel): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: channel === 'EMAIL' ? { email: value } : { phone: value },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Full principal for /auth/me — user + role-appropriate profile snapshot. */
  async getProfileSnapshot(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        coachProfile: {
          include: { subscriptions: { orderBy: { endsAt: 'desc' }, take: 1 } },
        },
      },
    });
    if (!user) return null;
    const sub = user.coachProfile?.subscriptions[0];
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      locale: user.locale,
      coachProfile: user.coachProfile
        ? {
            name: user.coachProfile.name,
            avatarUrl: user.coachProfile.avatarUrl,
            bio: user.coachProfile.bio,
          }
        : null,
      subscription: sub
        ? { status: sub.status, plan: sub.plan, endsAt: sub.endsAt }
        : null,
    };
  }

  /**
   * Creates a user for the given identifier/role. Coaches get a starter profile
   * and a 7-day trial; students claim any pre-authored profiles. All in one tx.
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const { identifier, channel, role, locale } = input;
    const data: Prisma.UserCreateInput = {
      role,
      locale: locale ?? 'fa',
      ...(channel === 'EMAIL' ? { email: identifier } : { phone: identifier }),
    };

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });

      if (role === Role.COACH) {
        await tx.coachProfile.create({
          data: { userId: user.id, name: defaultCoachName(channel, identifier) },
        });
        await tx.subscription.create({
          data: {
            coachId: user.id,
            status: SubscriptionStatus.TRIALING,
            startsAt: new Date(),
            endsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          },
        });
      } else {
        await this.claimStudentProfiles(tx, user.id, channel, identifier);
      }

      return user;
    });
  }

  /**
   * The linking rule: back-fill `userId` on every unlinked StudentProfile that
   * matches this identifier. Idempotent (only touches rows where userId IS NULL).
   */
  private async claimStudentProfiles(
    tx: Prisma.TransactionClient,
    userId: string,
    channel: IdentifierChannel,
    identifier: string,
  ): Promise<number> {
    const match = channel === 'EMAIL' ? { email: identifier } : { phone: identifier };
    const result = await tx.studentProfile.updateMany({
      where: { userId: null, ...match },
      data: { userId },
    });
    return result.count;
  }
}

function defaultCoachName(channel: IdentifierChannel, identifier: string): string {
  if (channel === 'EMAIL') return identifier.split('@')[0];
  return identifier;
}
