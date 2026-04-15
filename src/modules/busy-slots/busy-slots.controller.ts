import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { BusySlotsService } from './busy-slots.service';
import { CreateBusySlotDto, UpdateBusySlotDto } from './dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('busy-slots')
@UseGuards(JwtAuthGuard)
export class BusySlotsController {
  constructor(private busySlotsService: BusySlotsService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateBusySlotDto) {
    return this.busySlotsService.create(dto);
  }

  @Get()
  @HttpCode(200)
  async findAll(
    @Query('instructorId') instructorId: string,
    @Query('date') date?: string,
  ) {
    return this.busySlotsService.findAll(instructorId, date);
  }

  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string) {
    return this.busySlotsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(200)
  async update(@Param('id') id: string, @Body() dto: UpdateBusySlotDto) {
    return this.busySlotsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    await this.busySlotsService.delete(id);
  }
}
