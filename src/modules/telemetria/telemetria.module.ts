import { Module } from '@nestjs/common';
import { TelemetriaService } from './telemetria.service';
import { TelemetriaController } from './telemetria.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ShieldService } from './shield.service';
import { NavigatorService } from './navigator.service';

@Module({
  imports: [PrismaModule],
  controllers: [TelemetriaController],
  providers: [TelemetriaService, ShieldService, NavigatorService],
  exports: [TelemetriaService, ShieldService, NavigatorService],
})
export class TelemetriaModule {}
