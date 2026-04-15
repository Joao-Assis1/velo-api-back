import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StudentsModule } from './modules/students/students.module';
import { InstructorsModule } from './modules/instructors/instructors.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusySlotsModule } from './modules/busy-slots/busy-slots.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    HealthModule,
    PrismaModule,
    StudentsModule,
    InstructorsModule,
    VehiclesModule,
    AvailabilityModule,
    LessonsModule,
    PaymentsModule,
    AuthModule,
    BusySlotsModule,
    PaymentMethodsModule,
  ],
})
export class AppModule {}
