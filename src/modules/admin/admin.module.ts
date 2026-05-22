import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { stripeClientProvider } from '../payments-stripe/stripe.client';
import { PaymentsStripeModule } from '../payments-stripe/payments-stripe.module';

@Module({
  imports: [PrismaModule, ConfigModule, PaymentsStripeModule],
  controllers: [AdminController],
  providers: [AdminApiKeyGuard, stripeClientProvider],
})
export class AdminModule {}
