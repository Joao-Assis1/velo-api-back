import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CredentialsWorker {
  private readonly logger = new Logger(CredentialsWorker.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Daily check for expired credentials.
   * Runs at midnight every day.
   *
   * Sweeps (CONTRAN 1.020/2025):
   * 1. Legacy CNH expiry → instructor.isActive=false
   * 2. DETRAN credential expiry → credentialStatus=EXPIRED + stripeAccountStatus=RESTRICTED
   * 3. LADV expiry → student.ladvOcrStatus=FAIL + ladvUploaded=false
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredCredentials() {
    this.logger.log('Starting daily credentials validation worker...');
    const now = new Date();

    // 1. Legacy CNH expiry
    const expiredCnh = await this.prisma.instructor.findMany({
      where: { cnhExpiry: { lt: now.toISOString() } },
    });
    if (expiredCnh.length > 0) {
      this.logger.warn(
        `Found ${expiredCnh.length} instructors with expired CNH — blocking`,
      );
      await this.prisma.instructor.updateMany({
        where: { id: { in: expiredCnh.map((i) => i.id) } },
        data: { isActive: false },
      });
    }

    // 2. DETRAN credential expiry
    const expiredCredential = await this.prisma.instructor.findMany({
      where: {
        credentialValidUntil: { lt: now },
        credentialStatus: 'APPROVED',
      },
    });
    if (expiredCredential.length > 0) {
      this.logger.warn(
        `Found ${expiredCredential.length} instructors with expired DETRAN credential — marking EXPIRED + RESTRICTED`,
      );
      await this.prisma.instructor.updateMany({
        where: { id: { in: expiredCredential.map((i) => i.id) } },
        data: {
          credentialStatus: 'EXPIRED',
          stripeAccountStatus: 'RESTRICTED',
        },
      });
    }

    // 3. LADV expiry
    const expiredLadv = await this.prisma.student.findMany({
      where: { ladvValidUntil: { lt: now } },
    });
    if (expiredLadv.length > 0) {
      this.logger.warn(
        `Found ${expiredLadv.length} students with expired LADV — invalidating`,
      );
      await this.prisma.student.updateMany({
        where: { id: { in: expiredLadv.map((s) => s.id) } },
        data: { ladvOcrStatus: 'FAIL', ladvUploaded: false },
      });
    }

    this.logger.log('Daily credentials validation worker finished.');
  }

  async triggerManualCheck() {
    return this.handleExpiredCredentials();
  }
}
