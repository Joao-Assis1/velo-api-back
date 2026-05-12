import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasService } from './asaas.service';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private readonly platformFeePercent: number;

  constructor(
    private prisma: PrismaService,
    private asaasService: AsaasService,
    private configService: ConfigService,
  ) {
    this.platformFeePercent = parseFloat(
      this.configService.get<string>('PLATFORM_FEE_PERCENT') ?? '0.20',
    );
  }

  @Cron('*/5 * * * *')
  async releaseEscrowPayments() {
    const eligibleLessons = await this.prisma.lesson.findMany({
      where: {
        status: 'completed',
        paymentReleased: false,
        disputeOpened: false,
        checkInTime: { not: null },
        checkOutTime: { not: null },
      },
      include: {
        instructor: true,
        payment: true,
      },
    });

    for (const lesson of eligibleLessons) {
      if (!lesson.checkInTime || !lesson.checkOutTime) continue;

      const durationMinutes =
        (lesson.checkOutTime.getTime() - lesson.checkInTime.getTime()) / 60000;
      if (durationMinutes < 50) continue;

      const payment = lesson.payment;
      if (!payment || !payment.asaasId || payment.status !== 'COMPLETED')
        continue;

      const instructor = lesson.instructor;

      if (!instructor.pixKey && !instructor.bankAccount) {
        this.logger.warn(
          `Instructor ${instructor.id} has no PIX key or bank account — skipping lesson ${lesson.id}`,
        );
        continue;
      }

      const netAmount = payment.amount * (1 - this.platformFeePercent);

      try {
        const transferDto: any = instructor.pixKey
          ? {
              value: netAmount,
              operationType: 'PIX',
              pixAddressKey: instructor.pixKey,
            }
          : {
              value: netAmount,
              operationType: 'TED',
              bankAccount: {
                bank: { code: instructor.bankCode },
                ownerName: instructor.name,
                cpfCnpj: instructor.cpf,
                agency: instructor.bankAgency,
                account: instructor.bankAccount,
                accountDigit: '',
                bankAccountType: 'CONTA_CORRENTE',
              },
            };

        await this.asaasService.createTransfer(transferDto);
        await this.prisma.lesson.update({
          where: { id: lesson.id },
          data: { paymentReleased: true },
        });
        this.logger.log(
          `Released escrow for lesson ${lesson.id}: R$${netAmount.toFixed(2)} to instructor ${instructor.id}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to release escrow for lesson ${lesson.id}: ${err}`,
        );
      }
    }
  }
}
