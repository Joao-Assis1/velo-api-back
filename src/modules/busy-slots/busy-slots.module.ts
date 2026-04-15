import { Module } from '@nestjs/common';
import { BusySlotsService } from './busy-slots.service';
import { BusySlotsController } from './busy-slots.controller';

@Module({
  controllers: [BusySlotsController],
  providers: [BusySlotsService],
  exports: [BusySlotsService],
})
export class BusySlotsModule {}
