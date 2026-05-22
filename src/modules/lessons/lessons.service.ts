import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Lesson, Prisma } from '@prisma/client';
import { ShieldService } from '../telemetria/shield.service';
import { RegisterBiometryDto } from './dto/register-biometry.dto';
import { getDistanceInMeters } from '../../common/utils/geo.utils';
import { PaymentsStripeService } from '../payments-stripe/payments-stripe.service';
import { JourneyService } from '../journey/journey.service';
import { ValidationService } from '../validation/validation.service';
import { ConfigService } from '@nestjs/config';
import type { DocumentValidationProvider } from '../validation/providers/document-validation.provider';
import { DOCUMENT_VALIDATION_PROVIDER } from '../validation/providers/document-validation.provider';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private prisma: PrismaService,
    private shield: ShieldService,
    private paymentsStripe: PaymentsStripeService,
    private journey: JourneyService,
    private validation: ValidationService,
    private config: ConfigService,
    @Inject(DOCUMENT_VALIDATION_PROVIDER)
    private documentValidation: DocumentValidationProvider,
  ) {}

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    // === STAGE 1: Journey gate (LADV válida + stage >= LADV_UPLOADED_VALID) ===
    await this.journey.assertCanScheduleLesson(createLessonDto.studentId);

    // === STAGE 2: Instructor credential ===
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: createLessonDto.instructorId },
    });
    if (!instructor) {
      throw new BadRequestException('Instructor not found');
    }
    if (instructor.credentialStatus !== 'APPROVED') {
      throw new BadRequestException(
        `Instructor credential is ${instructor.credentialStatus} — only APPROVED is allowed`,
      );
    }
    if (
      !instructor.credentialValidUntil ||
      instructor.credentialValidUntil <= new Date()
    ) {
      throw new BadRequestException(
        'Instructor DETRAN credential is expired',
      );
    }

    // === STAGE 3: Instructor CNH local check + expiry ===
    const cnhResult = await this.validation.validateCnh(
      instructor.cnhNumber ?? '',
      instructor.cpf ?? '',
    );
    if (cnhResult.status === 'LOCAL_INVALID') {
      throw new BadRequestException(
        'Instructor CNH number failed local validation',
      );
    }
    if (!instructor.cnhExpiry || new Date(instructor.cnhExpiry) <= new Date()) {
      throw new BadRequestException('Instructor CNH is expired');
    }

    // === STAGE 4: SERPRO-style external check (only when provider=serpro) ===
    const externalProvider =
      this.config.get<string>('DOCUMENT_VALIDATION_PROVIDER') ?? 'mock';
    if (externalProvider === 'serpro') {
      const external = await this.documentValidation.validateCnh(
        instructor.cnhNumber ?? '',
        instructor.cpf ?? '',
      );
      if (!external.valid) {
        throw new BadRequestException(
          `Instructor CNH rejected by external provider (status=${external.status})`,
        );
      }
    }

    // === STAGE 5: Vehicle belongs to instructor ===
    if (createLessonDto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: createLessonDto.vehicleId },
      });
      if (!vehicle || vehicle.instructorId !== createLessonDto.instructorId) {
        throw new BadRequestException(
          'Vehicle does not belong to the selected instructor',
        );
      }
    }

    // === STAGE 6: Booking (existing transaction) ===
    return this.prisma.$transaction(async (tx) => {
      const existingLesson = await tx.lesson.findFirst({
        where: {
          instructorId: createLessonDto.instructorId,
          date: new Date(createLessonDto.date),
          startTime: createLessonDto.startTime,
        },
      });

      if (existingLesson) {
        throw new ConflictException(
          'Slot is already occupied by another lesson',
        );
      }

      const busySlots = await tx.busySlot.findMany({
        where: {
          instructorId: createLessonDto.instructorId,
          date: new Date(createLessonDto.date),
        },
      });

      const lessonStart = createLessonDto.startTime;
      const lessonEnd = createLessonDto.endTime;

      const isBusyConflict = busySlots.some((bs) => {
        return lessonStart < bs.endTime && lessonEnd > bs.startTime;
      });

      if (isBusyConflict) {
        throw new ConflictException(
          'Instructor is busy at this time (blocked slot)',
        );
      }

      return tx.lesson.create({
        data: {
          studentId: createLessonDto.studentId,
          instructorId: createLessonDto.instructorId,
          vehicleId: createLessonDto.vehicleId,
          date: new Date(createLessonDto.date),
          startTime: createLessonDto.startTime,
          endTime: createLessonDto.endTime,
          price: createLessonDto.price,
          status: 'pending_acceptance',
        },
      });
    });
  }

  async findAll(studentId?: string, instructorId?: string): Promise<Lesson[]> {
    const where: Prisma.LessonWhereInput = {};
    if (studentId) where.studentId = studentId;
    if (instructorId) where.instructorId = instructorId;

    return this.prisma.lesson.findMany({
      where,
      include: {
        student: true,
        instructor: true,
        vehicle: true,
        payment: { select: { status: true } },
      },
    });
  }

  async update(id: string, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });

    // C-019: Bloqueio de alteração se houver disputa aberta
    if (lesson?.disputeOpened && updateLessonDto.integrityHash) {
      throw new ForbiddenException(
        'Cannot modify integrity hash while a dispute is open',
      );
    }

    return this.prisma.lesson.update({
      where: { id },
      data: updateLessonDto,
    });
  }

  async checkIn(id: string, actorId: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new BadRequestException('Lesson not found');
    if (lesson.instructorId !== actorId) {
      throw new ForbiddenException('Only the assigned instructor can check in this lesson');
    }
    return this.prisma.lesson.update({
      where: { id },
      data: {
        status: 'in-progress',
        checkInTime: new Date(),
      },
    });
  }

  async checkOut(id: string, actorId: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }
    if (lesson.instructorId !== actorId) {
      throw new ForbiddenException('Only the assigned instructor can check out this lesson');
    }

    const checkOutTime = new Date();

    let durationMinutes: number | null = null;
    if (lesson.checkInTime) {
      durationMinutes = Math.round(
        (checkOutTime.getTime() - lesson.checkInTime.getTime()) / 60000,
      );
    }

    const integrityHash = await this.shield.generateLessonHash(id);

    const completedLesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        status: 'completed',
        checkOutTime,
        durationMinutes,
        integrityHash,
      },
    });

    try {
      await this.paymentsStripe.releaseEscrow(id);
    } catch (e) {
      this.logger.warn(
        `Escrow release skipped for lesson ${id}: ${(e as Error).message}`,
      );
    }

    return completedLesson;
  }

  async cancelLesson(id: string, actorId: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }
    if (lesson.studentId !== actorId && lesson.instructorId !== actorId) {
      throw new ForbiddenException('Only the student or instructor of this lesson can cancel it');
    }
    if (lesson.status === 'in-progress') {
      throw new BadRequestException(
        'Cannot cancel a lesson that is in progress',
      );
    }
    if (lesson.status === 'completed' || lesson.status === 'cancelled') {
      throw new BadRequestException(
        `Cannot cancel a lesson with status "${lesson.status}"`,
      );
    }

    // pending_acceptance: no payment was charged yet — skip refund
    if (lesson.status !== 'pending_acceptance') {
      const payment = await this.prisma.payment.findFirst({
        where: { lessonId: id },
      });

      if (payment && ['PENDING', 'HELD'].includes(payment.status)) {
        try {
          await this.paymentsStripe.resolveDispute(id, {
            action: 'refund',
            reason: 'lesson_cancelled',
          });
        } catch (err) {
          this.logger.error(
            `Failed to refund payment ${payment.id} on cancellation: ${err}`,
          );
        }
      }
    }

    return this.prisma.lesson.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async giveInstructorFeedback(id: string, actorId: string, feedback: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new BadRequestException('Lesson not found');
    if (lesson.instructorId !== actorId) {
      throw new ForbiddenException('Only the assigned instructor can give feedback on this lesson');
    }
    return this.prisma.lesson.update({
      where: { id },
      data: { instructorFeedback: feedback },
    });
  }

  async giveStudentFeedback(
    id: string,
    actorId: string,
    rating: number,
    text: string,
  ): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new BadRequestException('Lesson not found');
    if (lesson.studentId !== actorId) {
      throw new ForbiddenException('Only the assigned student can give feedback on this lesson');
    }
    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        studentFeedbackRating: rating,
        studentFeedbackText: text,
      },
    });

    const instructorId = updatedLesson.instructorId;

    const stats = await this.prisma.lesson.aggregate({
      where: {
        instructorId,
        studentFeedbackRating: { not: null },
      },
      _avg: {
        studentFeedbackRating: true,
      },
      _count: {
        studentFeedbackRating: true,
      },
    });

    const reviewsCount = stats._count.studentFeedbackRating || 0;
    const averageRating = stats._avg.studentFeedbackRating || 0;

    await this.prisma.instructor.update({
      where: { id: instructorId },
      data: {
        rating: averageRating,
        reviewsCount,
      },
    });

    return updatedLesson;
  }

  async accept(id: string, actorId: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new BadRequestException('Lesson not found');
    if (lesson.instructorId !== actorId) {
      throw new ForbiddenException('Only the assigned instructor can accept this lesson');
    }
    if (lesson.status !== 'pending_acceptance') {
      throw new BadRequestException(
        `Cannot accept lesson with status "${lesson.status}"`,
      );
    }

    // Find default payment method for the student
    const pm = await this.prisma.paymentMethod.findFirst({
      where: { studentId: lesson.studentId, isDefault: true, isDeleted: false },
    });
    if (!pm) {
      throw new HttpException(
        'Student has no default payment method',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    try {
      await this.paymentsStripe.charge(lesson.studentId, {
        lessonId: id,
        paymentMethodId: pm.id,
      });
    } catch (err: any) {
      this.logger.warn(`Payment failed on accept for lesson ${id}: ${err.message}`);
      throw new HttpException(
        err.message ?? 'Payment failed — lesson remains pending',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return this.prisma.lesson.update({
      where: { id },
      data: { status: 'upcoming' },
    });
  }

  async reject(id: string, actorId: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new BadRequestException('Lesson not found');
    if (lesson.instructorId !== actorId) {
      throw new ForbiddenException('Only the assigned instructor can reject this lesson');
    }
    if (lesson.status !== 'pending_acceptance') {
      throw new BadRequestException(
        `Cannot reject lesson with status "${lesson.status}"`,
      );
    }

    return this.prisma.lesson.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  // T-B04: Cancel stale pending_acceptance lessons older than 24h
  @Cron(CronExpression.EVERY_HOUR)
  async cancelStaleBookings(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await this.prisma.lesson.findMany({
      where: { status: 'pending_acceptance', createdAt: { lt: cutoff } },
      select: { id: true },
    });

    if (stale.length === 0) return;

    await this.prisma.lesson.updateMany({
      where: { id: { in: stale.map((l) => l.id) } },
      data: { status: 'cancelled' },
    });

    this.logger.log(
      `[cancelStaleBookings] Cancelled ${stale.length} stale pending_acceptance lessons`,
    );
  }

  async registerBiometry(
    lessonId: string,
    dto: RegisterBiometryDto,
  ): Promise<any> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        telemetry: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }

    // Geofencing check (C-008): 50 meters
    if (lesson.telemetry.length > 0) {
      const lastPoint = lesson.telemetry[0];
      const distance = getDistanceInMeters(
        dto.lat,
        dto.lng,
        lastPoint.lat,
        lastPoint.lng,
      );

      if (distance > 50) {
        throw new ForbiddenException(
          `Biometry rejected: Distance from last telemetry is ${Math.round(distance)}m (max 50m)`,
        );
      }
    }

    console.log(
      `[BIOMETRY] Lesson ${lessonId}, Step ${dto.step}, Status: ${dto.status}, GPS: ${dto.lat},${dto.lng}`,
    );

    const updateData: any = {};
    const now = new Date();

    if (dto.step === 'start') {
      updateData.biometryStartStatus = dto.status;
      updateData.biometryStartAt = now;
    } else if (dto.step === 'mid') {
      updateData.biometryMidStatus = dto.status;
      updateData.biometryMidAt = now;
    } else if (dto.step === 'end') {
      updateData.biometryEndStatus = dto.status;
      updateData.biometryEndAt = now;
    }

    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
    });

    return {
      success: true,
      message: `Biometry (${dto.step}) registered successfully`,
      timestamp: now,
    };
  }
}
