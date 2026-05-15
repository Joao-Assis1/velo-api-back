import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelemetriaModule } from '../telemetria/telemetria.module';
import { PaymentsModule } from '../payments/payments.module';
import { JourneyModule } from '../journey/journey.module';
import { ValidationModule } from '../validation/validation.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    TelemetriaModule,
    PaymentsModule,
    JourneyModule,
    ValidationModule,
    AuthModule,
  ],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
