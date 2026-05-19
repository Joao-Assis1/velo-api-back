import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { stripeClientProvider } from '../payments-stripe/stripe.client';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AdminController],
  providers: [AdminApiKeyGuard, stripeClientProvider],
})
export class AdminModule {}
