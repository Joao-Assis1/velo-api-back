import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LadvProcessController } from './ladv-process.controller';
import { LadvProcessService } from './ladv-process.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';
import { TestModeService } from '../../common/test-mode/test-mode.service';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule, ConfigModule],
  controllers: [LadvProcessController],
  providers: [LadvProcessService, TestModeService],
  exports: [LadvProcessService],
})
export class LadvProcessModule {}
