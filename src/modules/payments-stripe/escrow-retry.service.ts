import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsStripeService } from './payments-stripe.service';

const MAX_ATTEMPTS = Number(process.env.ESCROW_MAX_RETRY_ATTEMPTS ?? 3);
const CRON_EXPR = process.env.ESCROW_RETRY_CRON ?? '*/5 * * * *';

@Injectable()
export class EscrowRetryService {
  private readonly logger = new Logger(EscrowRetryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsStripe: PaymentsStripeService,
  ) {}

  @Cron(CRON_EXPR)
  async retryPendingReleases(): Promise<void> {
    const held = await this.prisma.payment.findMany({
      where: {
        status: 'HELD',
        releaseAttempts: { lt: MAX_ATTEMPTS },
        lesson: { status: 'completed' },
      },
      select: { id: true, lessonId: true, releaseAttempts: true },
    });

    if (held.length === 0) return;

    this.logger.log(
      `Escrow retry: found ${held.length} HELD payment(s) to retry`,
    );

    for (const payment of held) {
      if (!payment.lessonId) continue;

      try {
        await this.paymentsStripe.releaseEscrow(payment.lessonId);
        this.logger.log(`Escrow retry succeeded for payment ${payment.id}`);
      } catch (err) {
        const newAttempts = payment.releaseAttempts + 1;
        const exhausted = newAttempts >= MAX_ATTEMPTS;

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            releaseAttempts: newAttempts,
            lastReleaseAttemptAt: new Date(),
            ...(exhausted && { status: 'RELEASE_FAILED' }),
          },
        });

        if (exhausted) {
          this.logger.error(
            `Payment ${payment.id} exhausted ${MAX_ATTEMPTS} release attempts — status set to RELEASE_FAILED. Error: ${(err as Error).message}`,
          );
        } else {
          this.logger.warn(
            `Escrow retry attempt ${newAttempts}/${MAX_ATTEMPTS} failed for payment ${payment.id}: ${(err as Error).message}`,
          );
        }
      }
    }
  }
}
