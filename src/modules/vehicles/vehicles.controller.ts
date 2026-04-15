import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Patch('instructor/:instructorId')
  upsertByInstructor(
    @Param('instructorId') instructorId: string,
    @Body() vehicleData: Partial<CreateVehicleDto>,
  ) {
    return this.vehiclesService.upsertByInstructor(instructorId, vehicleData);
  }

  @Get()
  findAll(@Query('instructorId') instructorId?: string) {
    return this.vehiclesService.findAll(instructorId);
  }
}
