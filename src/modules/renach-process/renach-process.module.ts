import { Module } from '@nestjs/common';
import { RenachProcessController } from './renach-process.controller';
import { RenachProcessService } from './renach-process.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JourneyModule, AuthModule],
  controllers: [RenachProcessController],
  providers: [RenachProcessService],
})
export class RenachProcessModule {}
