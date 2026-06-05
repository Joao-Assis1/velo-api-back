import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { asaasClientProvider, AsaasClient } from './asaas.client';
import { PaymentsService } from './payments.service';
import { AsaasWebhooksController } from './asaas-webhooks.controller';
import { EscrowRetryService } from './escrow-retry.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AsaasWebhooksController],
  providers: [asaasClientProvider, AsaasClient, PaymentsService, EscrowRetryService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
