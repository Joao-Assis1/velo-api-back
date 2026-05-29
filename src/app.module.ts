import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { validate } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StudentsModule } from './modules/students/students.module';
import { InstructorsModule } from './modules/instructors/instructors.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { PaymentsStripeModule } from './modules/payments-stripe/payments-stripe.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusySlotsModule } from './modules/busy-slots/busy-slots.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { TelemetriaModule } from './modules/telemetria/telemetria.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AcademyModule } from './modules/academy/academy.module';
import { JourneyModule } from './modules/journey/journey.module';
import { ValidationModule } from './modules/validation/validation.module';
import { RenachProcessModule } from './modules/renach-process/renach-process.module';
import { LadvProcessModule } from './modules/ladv-process/ladv-process.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    CacheModule.register({ isGlobal: true, ttl: 60 * 1000 }),
    ScheduleModule.forRoot(),
    HealthModule,
    PrismaModule,
    StudentsModule,
    InstructorsModule,
    VehiclesModule,
    AvailabilityModule,
    LessonsModule,
    PaymentsStripeModule,
    AuthModule,
    BusySlotsModule,
    PaymentMethodsModule,
    TelemetriaModule,
    ComplianceModule,
    AcademyModule,
    JourneyModule,
    ValidationModule,
    RenachProcessModule,
    LadvProcessModule,
    AdminModule,
  ],
})
export class AppModule {}
