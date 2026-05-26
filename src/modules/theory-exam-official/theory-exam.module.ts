import { Module } from '@nestjs/common';
import { TheoryExamOfficialController } from './theory-exam.controller';
import { TheoryExamOfficialService } from './theory-exam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [TheoryExamOfficialController],
  providers: [TheoryExamOfficialService],
})
export class TheoryExamOfficialModule {}
