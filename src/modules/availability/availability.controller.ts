import { Controller, Get, Post, Body, Query, Put, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { Availability } from '@prisma/client';

interface AvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled?: boolean;
}

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  create(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<Availability> {
    return this.availabilityService.create(createAvailabilityDto);
  }

  @Put('instructor/:instructorId')
  updateByInstructor(
    @Param('instructorId') instructorId: string,
    @Body() availabilities: AvailabilityInput[],
  ): Promise<Availability[]> {
    return this.availabilityService.replaceInstructorAvailability(
      instructorId,
      availabilities,
    );
  }

  @Get()
  findAll(
    @Query('instructorId') instructorId?: string,
  ): Promise<Availability[]> {
    return this.availabilityService.findAll(instructorId);
  }
}
