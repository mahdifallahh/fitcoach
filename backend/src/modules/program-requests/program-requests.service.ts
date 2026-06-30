import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProgramRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StudentsService } from '../students/students.service';
import { CreateProgramRequestDto } from './dto/create-request.dto';

@Injectable()
export class ProgramRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly students: StudentsService,
  ) {}

  /** Presigned PUT target for an intake photo (private `requests` bucket). */
  async imageUploadUrl(studentUserId: string, contentType: string) {
    const target = await this.storage.createUploadTarget('requests', {
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
    if (!coach) throw new NotFoundException({ code: 'COACH_NOT_FOUND', message: 'Coach not found' });

    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { phone: true, email: true },
    });
    const contact = user?.phone ?? user?.email;
    if (!contact) throw new BadRequestException({ code: 'CONTACT_REQUIRED', message: 'Account has no phone or email' });

    return this.prisma.$transaction(async (tx) => {
      // Link (or create) the coach's StudentProfile for this student, carrying stats over.
      const profile = await this.students.findOrCreateForProgram(
        coach.userId,
        contact,
        { heightCm: dto.heightCm, weightKg: dto.weightKg },
        tx,
      );
      return tx.programRequest.create({
        data: {
          coachId: coach.userId,
          studentUserId,
          studentProfileId: profile.id,
          fullName: dto.fullName,
          phone: user?.phone ?? null,
          weightKg: dto.weightKg ?? null,
          heightCm: dto.heightCm ?? null,
          practiceHistory: dto.practiceHistory ?? null,
          injuries: dto.injuries ?? null,
          description: dto.description ?? null,
          imageKeys: dto.imageKeys ?? [],
        },
      });
    });
  }

  /** The logged-in student's own submissions. */
  listForStudent(studentUserId: string) {
    return this.prisma.programRequest.findMany({
      where: { studentUserId },
      orderBy: { createdAt: 'desc' },
      include: { coach: { select: { name: true, handle: true } } },
    });
  }

  /** A coach's inbox: requests with short-lived signed photo URLs + a contact for prefill. */
  async listForCoach(coachId: string) {
    const requests = await this.prisma.programRequest.findMany({
      where: { coachId },
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { phone: true, email: true } } },
    });
    return Promise.all(
      requests.map(async (r) => {
        const imageUrls = await Promise.all(r.imageKeys.map((key) => this.storage.presignGet('requests', key, 600)));
        const { student, imageKeys, ...rest } = r;
        return { ...rest, imageUrls, contact: r.phone ?? student.phone ?? student.email ?? '' };
      }),
    );
  }

  /** Coach marks a request reviewed/declined (ownership enforced). */
  async updateStatus(coachId: string, id: string, status: ProgramRequestStatus) {
    const res = await this.prisma.programRequest.updateMany({ where: { id, coachId }, data: { status } });
    if (res.count === 0) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
    return this.prisma.programRequest.findUnique({ where: { id } });
  }
}
