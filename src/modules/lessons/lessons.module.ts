import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelemetriaModule } from '../telemetria/telemetria.module';
import { PaymentsStripeModule } from '../payments-stripe/payments-stripe.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    TelemetriaModule,
    PaymentsStripeModule,
    JourneyModule,
    AuthModule,
  ],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
