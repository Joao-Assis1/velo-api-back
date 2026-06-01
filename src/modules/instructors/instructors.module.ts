import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InstructorsController } from './instructors.controller';
import { InstructorsService } from './instructors.service';
import { PrismaModule } from '../prisma/prisma.module';
import { stripeClientProvider } from '../payments-stripe/stripe.client';
import { TestModeService } from '../../common/test-mode/test-mode.service';
import { TestModeGuard } from '../../common/test-mode/test-mode.guard';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [InstructorsController],
  providers: [
    InstructorsService,
    stripeClientProvider,
    TestModeService,
    TestModeGuard,
  ],
  exports: [InstructorsService],
})
export class InstructorsModule {}
