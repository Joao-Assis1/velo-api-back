import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsStripeController } from './payments-stripe.controller';
import { PaymentsStripeService } from './payments-stripe.service';
import { StripeConnectService } from './stripe-connect.service';
import { StripeWebhooksController } from './stripe-webhooks.controller';
import { stripeClientProvider, StripeClientHolder } from './stripe.client';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentsStripeController, StripeWebhooksController],
  providers: [
    PaymentsStripeService,
    StripeConnectService,
    StripeClientHolder,
    stripeClientProvider,
  ],
  exports: [PaymentsStripeService, StripeConnectService],
})
export class PaymentsStripeModule {}
