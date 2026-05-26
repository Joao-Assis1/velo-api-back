import { Module } from '@nestjs/common';
import { PsychologicalExamController } from './psychological-exam.controller';
import { PsychologicalExamService } from './psychological-exam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [PsychologicalExamController],
  providers: [PsychologicalExamService],
  exports: [PsychologicalExamService],
})
export class PsychologicalExamModule {}
