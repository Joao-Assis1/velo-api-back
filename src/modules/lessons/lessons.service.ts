import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Lesson, Prisma } from '@prisma/client';
import { ShieldService } from '../telemetria/shield.service';
import { RegisterBiometryDto } from './dto/register-biometry.dto';
import { getDistanceInMeters } from '../../common/utils/geo.utils';
import { AsaasService } from '../payments/asaas.service';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private prisma: PrismaService,
    private shield: ShieldService,
    private asaasService: AsaasService,
  ) {}

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: createLessonDto.studentId },
      });

      if (!student) {
        throw new BadRequestException('Student not found');
      }

      if (!student.ladvUploaded) {
        throw new BadRequestException(
          'Student must upload LADV before booking lessons',
        );
      }

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
          status: 'upcoming',
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

  async checkIn(id: string): Promise<Lesson> {
    return this.prisma.lesson.update({
      where: { id },
      data: {
        status: 'in-progress',
        checkInTime: new Date(),
      },
    });
  }

  async checkOut(id: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }

    const checkOutTime = new Date();

    let durationMinutes: number | null = null;
    if (lesson.checkInTime) {
      durationMinutes = Math.round(
        (checkOutTime.getTime() - lesson.checkInTime.getTime()) / 60000,
      );
    }

    const integrityHash = await this.shield.generateLessonHash(id);

    // paymentReleased is NOT set here — EscrowService cron is the sole source of truth
    return this.prisma.lesson.update({
      where: { id },
      data: {
        status: 'completed',
        checkOutTime,
        durationMinutes,
        integrityHash,
      },
    });
  }

  async cancelLesson(id: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new BadRequestException('Lesson not found');
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

    const payment = await this.prisma.payment.findFirst({
      where: { lessonId: id },
    });

    if (
      payment?.asaasId &&
      ['PENDING', 'COMPLETED'].includes(payment.status)
    ) {
      const lessonDateTime = new Date(lesson.date);
      const [h, m] = lesson.startTime.split(':').map(Number);
      lessonDateTime.setHours(h, m, 0, 0);
      const hoursUntilLesson =
        (lessonDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

      const lateFeePercent = parseFloat(
        process.env.LATE_CANCELLATION_FEE_PERCENT ?? '0.07',
      );
      const isLateCancellation = hoursUntilLesson <= 24;

      this.logger.log(
        `Cancelling lesson ${id}: ${hoursUntilLesson.toFixed(1)}h until start, late=${isLateCancellation}`,
      );

      const refundAmount = isLateCancellation
        ? payment.amount * (1 - lateFeePercent)
        : payment.amount;

      try {
        await this.asaasService.refundCharge(payment.asaasId, refundAmount);
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        });
      } catch (err) {
        this.logger.error(
          `Failed to refund payment ${payment.id} on cancellation: ${err}`,
        );
      }
    }

    return this.prisma.lesson.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async giveInstructorFeedback(id: string, feedback: string): Promise<Lesson> {
    return this.prisma.lesson.update({
      where: { id },
      data: { instructorFeedback: feedback },
    });
  }

  async giveStudentFeedback(
    id: string,
    rating: number,
    text: string,
  ): Promise<Lesson> {
    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        studentFeedbackRating: rating,
        studentFeedbackText: text,
      },
    });

    const instructorId = updatedLesson.instructorId;

    const lessonsWithRating = await this.prisma.lesson.findMany({
      where: {
        instructorId,
        studentFeedbackRating: { not: null },
      },
    });

    const reviewsCount = lessonsWithRating.length;
    const totalRating = lessonsWithRating.reduce(
      (sum, lesson) => sum + (lesson.studentFeedbackRating || 0),
      0,
    );
    const averageRating = reviewsCount > 0 ? totalRating / reviewsCount : 0;

    await this.prisma.instructor.update({
      where: { id: instructorId },
      data: {
        rating: averageRating,
        reviewsCount,
      },
    });

    return updatedLesson;
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
