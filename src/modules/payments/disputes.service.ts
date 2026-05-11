import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisputesService {
  constructor(private prisma: PrismaService) {}

  async openDispute(lessonId: string, reason: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.status !== 'completed') {
      throw new BadRequestException('Dispute can only be opened for completed lessons');
    }

    // C-018: 48h limit
    const now = new Date();
    const checkOutTime = lesson.checkOutTime;
    if (checkOutTime) {
      const diffMs = now.getTime() - checkOutTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 48) {
        throw new ForbiddenException('Dispute window expired (max 48h after checkout)');
      }
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        disputeOpened: true,
        disputeReason: reason,
        paymentReleased: false, // Bloquear fundos
      },
    });
  }

  async resolveDispute(lessonId: string, released: boolean) {
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        disputeOpened: false,
        paymentReleased: released,
      },
    });
  }
}
