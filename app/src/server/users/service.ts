import "server-only";
import { Prisma, Role, type PrismaClient, type User } from "@prisma/client";
import type { IdentifierChannel } from "../utils/identifier";
import { generateUniqueHandle } from "../utils/handle";

interface CreateUserInput {
  identifier: string; // normalized
  channel: IdentifierChannel;
  role: Role;
  locale?: string;
}

export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  findByIdentifier(
    value: string,
    channel: IdentifierChannel,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: channel === "EMAIL" ? { email: value } : { phone: value },
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
          include: { subscriptions: { orderBy: { endsAt: "desc" }, take: 1 } },
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
   * (no subscription yet — they activate their one-time free trial themselves from
   * the billing page); students claim any pre-authored profiles. All in one tx.
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const { identifier, channel, role, locale } = input;
    const data: Prisma.UserCreateInput = {
      role,
      locale: locale ?? "fa",
      ...(channel === "EMAIL" ? { email: identifier } : { phone: identifier }),
    };

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });

      if (role === Role.COACH) {
        const coachName = defaultCoachName(channel, identifier);
        // Seed the public handle from the name only for email coaches; never from a
        // phone number (it would leak the phone in the public URL) — those get coach-<rand>.
        const handleSeed = channel === "EMAIL" ? coachName : "";
        const handle = await generateUniqueHandle(
          handleSeed,
          async (h) =>
            (await tx.coachProfile.findUnique({
              where: { handle: h },
              select: { userId: true },
            })) !== null,
        );
        await tx.coachProfile.create({
          data: { userId: user.id, name: coachName, handle },
        });
      } else if (role === Role.STUDENT) {
        await this.claimStudentProfiles(tx, user.id, channel, identifier);
      }
      // ADMIN gets neither a coach profile nor student claiming — it's a pure
      // platform-owner account.

      return user;
    });
  }

  /** Promote/demote a user (used to elevate ADMIN_PHONES owners on login). */
  setRole(id: string, role: Role): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { role } });
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
    const match =
      channel === "EMAIL" ? { email: identifier } : { phone: identifier };
    const result = await tx.studentProfile.updateMany({
      where: { userId: null, ...match },
      data: { userId },
    });
    return result.count;
  }
}

function defaultCoachName(
  channel: IdentifierChannel,
  identifier: string,
): string {
  if (channel === "EMAIL") return identifier.split("@")[0];
  return identifier;
}
