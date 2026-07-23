import "server-only";
import {
  Prisma,
  Role,
  SubscriptionStatus,
  SubscriptionTier,
  type PrismaClient,
  type User,
} from "@prisma/client";
import type { IdentifierChannel } from "../utils/identifier";
import { generateUniqueHandle } from "../utils/handle";
import { NotFoundException } from "../http/errors";

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
          include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
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
      // Capabilities drive the UI's role switcher (which panels are available).
      isCoach: user.isCoach,
      isStudent: user.isStudent,
      locale: user.locale,
      coachProfile: user.coachProfile
        ? {
            name: user.coachProfile.name,
            avatarUrl: user.coachProfile.avatarUrl,
            bio: user.coachProfile.bio,
          }
        : null,
      subscription: sub
        ? { status: sub.status, tier: sub.tier, plan: sub.plan, endsAt: sub.endsAt }
        : null,
    };
  }

  /**
   * Creates a user for the given identifier/role. Coaches get a starter profile
   * plus a permanent FREE subscription (1 student, never expires); students claim
   * any pre-authored profiles. All in one tx.
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const { identifier, channel, role, locale } = input;
    const data: Prisma.UserCreateInput = {
      role,
      // The signup role also turns on that side's capability. The other side can
      // be enabled later from the account page — one phone, both roles.
      isCoach: role === Role.COACH,
      isStudent: role === Role.STUDENT,
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
        // Every coach starts on the permanent, free tier (1 student, never
        // expires) — no activation step. Paid tiers upgrade this row later.
        await tx.subscription.create({
          data: {
            coachId: user.id,
            tier: SubscriptionTier.FREE,
            status: SubscriptionStatus.ACTIVE,
            endsAt: null,
          },
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
   * Permanently delete an account and everything it owns (GDPR-style erasure).
   *
   * Order matters and is deliberate: `ProgramExercise`/`TemplateExercise`
   * reference `Exercise` with **onDelete: Restrict**, so a bare `DELETE FROM
   * "User"` can fail — Postgres does not guarantee the order it applies cascades
   * in, and removing an Exercise while a ProgramExercise still points at it is
   * blocked. Deleting programs and templates first clears those references, then
   * the exercises can go.
   *
   * What survives on purpose: `StudentProfile.userId` is `onDelete: SetNull`, so
   * when a *student* deletes their account the coach keeps the profile and the
   * programs they authored — the row simply becomes unclaimed again (the same
   * state as before the student ever signed up). Only the coach's own data is
   * destroyed when a coach deletes.
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const coach = await tx.coachProfile.findUnique({
        where: { userId },
        select: { userId: true },
      });

      if (coach) {
        // Clear Exercise references before the exercises themselves.
        await tx.program.deleteMany({ where: { coachId: userId } });
        await tx.programTemplate.deleteMany({ where: { coachId: userId } });
        await tx.exercise.deleteMany({ where: { coachId: userId } });
        await tx.exerciseCategory.deleteMany({ where: { coachId: userId } });
        await tx.programRequest.deleteMany({ where: { coachId: userId } });
        await tx.studentProfile.deleteMany({ where: { coachId: userId } });
        await tx.payment.deleteMany({ where: { coachId: userId } });
        await tx.subscription.deleteMany({ where: { coachId: userId } });
        await tx.coachProfile.delete({ where: { userId } });
      }

      // Requests this account submitted as a student.
      await tx.programRequest.deleteMany({ where: { studentUserId: userId } });
      // Release any student profiles claimed by this account (coach keeps them).
      await tx.studentProfile.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }

  /** Capability flags for the session token (coach side / student side). */
  async getCapabilities(id: string): Promise<{
    isCoach: boolean;
    isStudent: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { isCoach: true, isStudent: true },
    });
    return {
      isCoach: user?.isCoach ?? false,
      isStudent: user?.isStudent ?? false,
    };
  }

  /**
   * Turn on this account's coach side (idempotent). Creates the CoachProfile +
   * unique public handle the first time — the same setup `createUser` does for a
   * coach signup — so an existing student can start coaching without a second
   * account. The caller re-issues the session so the new capability lands in the
   * token.
   */
  async enableCoach(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, email: true, isCoach: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.coachProfile.findUnique({
        where: { userId: id },
        select: { userId: true },
      });
      if (!existing) {
        // Never seed the handle from a phone (it would leak it in the public
        // URL) — mirrors the rule in `createUser`.
        const seed = user.email ? user.email.split("@")[0] : "";
        const handle = await generateUniqueHandle(
          seed,
          async (h) =>
            (await tx.coachProfile.findUnique({
              where: { handle: h },
              select: { userId: true },
            })) !== null,
        );
        await tx.coachProfile.create({
          data: {
            userId: id,
            name: user.phone ?? user.email ?? "",
            handle,
          },
        });
      }
      await tx.user.update({ where: { id }, data: { isCoach: true } });
    });
  }

  /**
   * Turn on this account's student side (idempotent) and immediately claim any
   * programs a coach already wrote for this phone/email — the same linking rule
   * that runs at student signup.
   */
  async enableStudent(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, email: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { isStudent: true } });
      if (user.phone) {
        await this.claimStudentProfiles(tx, id, "SMS", user.phone);
      }
      if (user.email) {
        await this.claimStudentProfiles(tx, id, "EMAIL", user.email);
      }
    });
  }

  /** Store a new password (already hashed by the caller). */
  setPasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
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
