import { Module } from '@nestjs/common';
import { LadvProcessController } from './ladv-process.controller';
import { LadvProcessService } from './ladv-process.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [LadvProcessController],
  providers: [LadvProcessService],
  exports: [LadvProcessService],
})
export class LadvProcessModule {}
