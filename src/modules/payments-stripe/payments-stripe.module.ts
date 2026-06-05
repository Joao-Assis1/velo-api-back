import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsStripeController } from './payments-stripe.controller';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeWebhooksController } from './stripe-webhooks.controller';
import { stripeClientProvider, StripeClientHolder } from './stripe.client';
import { EscrowRetryService } from './escrow-retry.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentsStripeController, StripeWebhooksController],
  providers: [
    PaymentsStripeService,
    StripeClientHolder,
    stripeClientProvider,
    EscrowRetryService,
  ],
  exports: [PaymentsStripeService],
})
export class PaymentsStripeModule {}
