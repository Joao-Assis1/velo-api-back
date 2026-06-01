import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

type StripeInstance = InstanceType<typeof Stripe>;
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe.client';
import { idempotencyKey } from './lib/idempotency';
import {
  ConnectOnboardResponseDto,
  ConnectStatusDto,
} from './dto/connect-status.dto';

interface StripeAccountSnapshot {
  payouts_enabled: boolean;
  charges_enabled: boolean;
  requirements?: { disabled_reason?: string | null };
}

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeInstance,
    private readonly config: ConfigService,
  ) {}

  async provisionAccount(instructorId: string, email: string): Promise<void> {
    const account = await this.stripe.accounts.create(
      {
        type: 'express',
        country: 'BR',
        email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: { instructorId },
      },
      { idempotencyKey: idempotencyKey(instructorId, 'connect-account') },
    );
    await this.prisma.instructor.update({
      where: { id: instructorId },
      data: {
        stripeAccountId: account.id,
        stripeAccountStatus: 'ONBOARDING',
      },
    });
  }

  async startOnboarding(
    instructorId: string,
  ): Promise<ConnectOnboardResponseDto> {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: instructorId },
      select: { id: true, email: true, stripeAccountId: true },
    });
    if (!instructor) throw new NotFoundException('Instructor not found');

    let accountId = instructor.stripeAccountId;
    if (!accountId) {
      const account = await this.stripe.accounts.create(
        {
          type: 'express',
          country: 'BR',
          email: instructor.email,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          metadata: { instructorId },
        },
        { idempotencyKey: idempotencyKey(instructorId, 'connect-account') },
      );
      accountId = account.id;
      await this.prisma.instructor.update({
        where: { id: instructorId },
        data: {
          stripeAccountId: accountId,
          stripeAccountStatus: 'ONBOARDING',
        },
      });
    }

    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url:
        this.config.get<string>('STRIPE_CONNECT_REFRESH_URL') ??
        'http://localhost:3001/api/v1/payments-stripe/connect/refresh',
      return_url:
        this.config.get<string>('STRIPE_CONNECT_RETURN_URL') ??
        'http://localhost:3001/api/v1/payments-stripe/connect/return',
      type: 'account_onboarding',
    });
    return { url: link.url, expiresAt: link.expires_at };
  }

  async getStatus(instructorId: string): Promise<ConnectStatusDto> {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: instructorId },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        stripePayoutsEnabled: true,
      },
    });
    if (!instructor) throw new NotFoundException('Instructor not found');
    return {
      stripeAccountId: instructor.stripeAccountId,
      stripeAccountStatus: instructor.stripeAccountStatus,
      stripePayoutsEnabled: instructor.stripePayoutsEnabled,
    };
  }

  async updateAccountStatus(
    stripeAccountId: string,
    snapshot: StripeAccountSnapshot,
  ): Promise<void> {
    const instructor = await this.prisma.instructor.findUnique({
      where: { stripeAccountId },
      select: { id: true },
    });
    if (!instructor) {
      this.logger.warn(
        `No instructor found for stripeAccountId=${stripeAccountId} — ignoring webhook`,
      );
      return;
    }
    const disabled = snapshot.requirements?.disabled_reason ?? null;
    let status: 'ACTIVE' | 'ONBOARDING' | 'RESTRICTED';
    if (disabled) status = 'RESTRICTED';
    else if (snapshot.payouts_enabled && snapshot.charges_enabled)
      status = 'ACTIVE';
    else status = 'ONBOARDING';

    await this.prisma.instructor.update({
      where: { id: instructor.id },
      data: {
        stripeAccountStatus: status,
        stripePayoutsEnabled: !!snapshot.payouts_enabled,
      },
    });
  }
}
