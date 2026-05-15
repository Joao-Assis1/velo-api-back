import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import type { Request } from 'express';
import { STRIPE_CLIENT } from './stripe.client';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeConnectService } from './stripe-connect.service';
import { routeStripeEvent } from './lib/event-router';

interface RequestWithRaw extends Request {
  rawBody?: Buffer;
}

@ApiExcludeController()
@Controller('webhooks/stripe')
export class StripeWebhooksController {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly payments: PaymentsStripeService,
    private readonly connect: StripeConnectService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RequestWithRaw,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: true }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET not configured');
    }
    if (!req.rawBody) {
      throw new BadRequestException(
        'rawBody not available — check main.ts raw body middleware',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(req.rawBody, signature, secret);
    } catch (e) {
      throw new BadRequestException(
        `Stripe signature verification failed: ${(e as Error).message}`,
      );
    }

    await routeStripeEvent(event, {
      onPaymentIntentSucceeded: (pi) =>
        this.payments.handlePaymentIntentSucceeded(pi),
      onPaymentIntentFailed: (pi) =>
        this.payments.handlePaymentIntentFailed(pi),
      onAccountUpdated: (account) =>
        this.connect.updateAccountStatus(account.id, {
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
          requirements: account.requirements
            ? { disabled_reason: account.requirements.disabled_reason ?? null }
            : { disabled_reason: null },
        }),
      onTransferCreated: (transfer) =>
        this.payments.handleTransferCreated(transfer),
      onTransferFailed: (transfer) =>
        this.payments.handleTransferFailed(transfer),
    });

    return { received: true };
  }
}
