import "server-only";
import { ProgramRequestStatus, type PrismaClient } from "@prisma/client";
import { StorageService } from "../storage";
import { StudentsService } from "../students/service";
import { BadRequestException, NotFoundException } from "../http/errors";
import type {
  CreateProgramRequestDto,
  UpdateRequestStatusDto,
} from "./schemas";

export class ProgramRequestsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
    private readonly students: StudentsService,
  ) {}

  /** Presigned PUT target for an intake photo (private `requests` bucket). */
  async imageUploadUrl(studentUserId: string, contentType: string) {
    const target = await this.storage.createUploadTarget("requests", {
      keyPrefix: `intake/${studentUserId}`,
      contentType,
    });
    return { uploadUrl: target.uploadUrl, key: target.key };
  }

  /** Student submits an intake request for the coach identified by `handle`. */
  async create(studentUserId: string, dto: CreateProgramRequestDto) {
    const coach = await this.prisma.coachProfile.findUnique({
      where: { handle: dto.handle },
      select: { userId: true },
    });
    if (!coach)
      throw new NotFoundException({
        code: "COACH_NOT_FOUND",
        message: "Coach not found",
      });

    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { phone: true, email: true },
    });
    const contact = user?.phone ?? user?.email;
    if (!contact)
      throw new BadRequestException({
        code: "CONTACT_REQUIRED",
        message: "Account has no phone or email",
      });

    return this.prisma.$transaction(async (tx) => {
      // Link (or create) the coach's StudentProfile for this student, carrying stats over.
      const profile = await this.students.findOrCreateForProgram(
        coach.userId,
        contact,
        { age: dto.age, heightCm: dto.heightCm, weightKg: dto.weightKg },
        tx,
      );
      return tx.programRequest.create({
        data: {
          coachId: coach.userId,
          studentUserId,
          studentProfileId: profile.id,
          fullName: dto.fullName,
          phone: user?.phone ?? null,
          age: dto.age ?? null,
          weightKg: dto.weightKg ?? null,
          heightCm: dto.heightCm ?? null,
          trainingYears: dto.trainingYears ?? null,
          trainingMonths: dto.trainingMonths ?? null,
          medicalHistory: dto.medicalHistory ?? null,
          daysPerWeek: dto.daysPerWeek ?? null,
          photoFrontKey: dto.photoFrontKey ?? null,
          photoSideKey: dto.photoSideKey ?? null,
          photoBackKey: dto.photoBackKey ?? null,
          receiptKey: dto.receiptKey ?? null,
        },
      });
    });
  }

  /** The logged-in student's own submissions (with coach + status + decline reason). */
  listForStudent(studentUserId: string) {
    return this.prisma.programRequest.findMany({
      where: { studentUserId },
      orderBy: { createdAt: "desc" },
      include: {
        coach: { select: { name: true, handle: true, avatarUrl: true } },
      },
    });
  }

  /** A coach's inbox: requests with short-lived signed photo URLs + a contact for prefill. */
  async listForCoach(coachId: string) {
    const requests = await this.prisma.programRequest.findMany({
      where: { coachId },
      orderBy: { createdAt: "desc" },
      include: { student: { select: { phone: true, email: true } } },
    });
    return Promise.all(
      requests.map(async (r) => {
        const sign = (key: string | null) =>
          key
            ? this.storage.presignGet("requests", key, 600)
            : Promise.resolve(null);
        const [photoFrontUrl, photoSideUrl, photoBackUrl, receiptUrl] =
          await Promise.all([
            sign(r.photoFrontKey),
            sign(r.photoSideKey),
            sign(r.photoBackKey),
            sign(r.receiptKey),
          ]);
        const {
          student,
          photoFrontKey,
          photoSideKey,
          photoBackKey,
          receiptKey,
          ...rest
        } = r;
        return {
          ...rest,
          photoFrontUrl,
          photoSideUrl,
          photoBackUrl,
          receiptUrl,
          contact: r.phone ?? student.phone ?? student.email ?? "",
        };
      }),
    );
  }

  /** Coach accepts (→ writes a program) or declines a request with a reason (ownership enforced). */
  async updateStatus(coachId: string, id: string, dto: UpdateRequestStatusDto) {
    if (
      dto.status === ProgramRequestStatus.DECLINED &&
      !dto.declineReason?.trim()
    ) {
      throw new BadRequestException({
        code: "REASON_REQUIRED",
        message: "A decline reason is required",
      });
    }
    const res = await this.prisma.programRequest.updateMany({
      where: { id, coachId },
      data: {
        status: dto.status,
        declineReason:
          dto.status === ProgramRequestStatus.DECLINED
            ? dto.declineReason!.trim()
            : null,
      },
    });
    if (res.count === 0)
      throw new NotFoundException({
        code: "REQUEST_NOT_FOUND",
        message: "Request not found",
      });
    return this.prisma.programRequest.findUnique({ where: { id } });
  }
}
