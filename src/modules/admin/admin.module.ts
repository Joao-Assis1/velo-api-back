import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, ConfigModule, PaymentsModule],
  controllers: [AdminController],
  providers: [AdminApiKeyGuard],
})
export class AdminModule {}
