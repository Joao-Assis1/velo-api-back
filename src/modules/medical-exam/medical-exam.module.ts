import { Module } from '@nestjs/common';
import { MedicalExamController } from './medical-exam.controller';
import { MedicalExamService } from './medical-exam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [MedicalExamController],
  providers: [MedicalExamService],
  exports: [MedicalExamService],
})
export class MedicalExamModule {}
