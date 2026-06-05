import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { asaasClientProvider } from '../payments/asaas.client';
import { TestModeService } from '../../common/test-mode/test-mode.service';
import { TestModeGuard } from '../../common/test-mode/test-mode.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentMethodsController],
  providers: [
    PaymentMethodsService,
    asaasClientProvider,
    TestModeService,
    TestModeGuard,
  ],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
