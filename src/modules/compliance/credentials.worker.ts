import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CredentialsWorker {
  private readonly logger = new Logger(CredentialsWorker.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Daily check for expired credentials (CNH and LADV).
   * Runs at midnight every day.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredCredentials() {
    this.logger.log('Starting daily credentials validation worker...');
    
    const now = new Date();

    // 1. Check for expired CNHs
    // instructors where cnhExpiry < now and status is not already inactive
    const expiredInstructors = await this.prisma.instructor.findMany({
      where: {
        cnhExpiry: {
          lt: now.toISOString(),
        },
      },
    });

    if (expiredInstructors.length > 0) {
      this.logger.warn(
        `Found ${expiredInstructors.length} instructors with expired CNH. Blocking accounts...`,
      );
      
      await this.prisma.instructor.updateMany({
        where: {
          id: { in: expiredInstructors.map((i) => i.id) },
        },
        data: {
          isActive: false,
        },
      });

      for (const instructor of expiredInstructors) {
        this.logger.error(
          `Instructor ${instructor.id} (${instructor.name}) blocked: CNH expired on ${instructor.cnhExpiry}`,
        );
      }
    }

    // 2. Check for expired LADVs (Students)
    const expiredStudents = await this.prisma.student.findMany({
      where: {
        ladv_validation_date: {
          lt: now,
        },
        ladvUploaded: true,
      },
    });

    if (expiredStudents.length > 0) {
      this.logger.warn(`Found ${expiredStudents.length} students with expired LADV.`);
      await this.prisma.student.updateMany({
        where: {
          id: { in: expiredStudents.map(s => s.id) },
        },
        data: {
          ladvUploaded: false,
        },
      });
    }

    this.logger.log('Daily credentials validation worker finished.');
  }

  /**
   * Manual trigger for testing purposes.
   */
  async triggerManualCheck() {
    return this.handleExpiredCredentials();
  }
}
