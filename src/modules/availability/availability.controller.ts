import { Controller, Get, Post, Body, Query, Put, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  create(@Body() createAvailabilityDto: CreateAvailabilityDto) {
    return this.availabilityService.create(createAvailabilityDto);
  }

  @Put('instructor/:instructorId')
  updateByInstructor(
    @Param('instructorId') instructorId: string,
    @Body() availabilities: any[],
  ) {
    return this.availabilityService.replaceInstructorAvailability(
      instructorId,
      availabilities,
    );
  }

  @Get()
  findAll(@Query('instructorId') instructorId?: string) {
    return this.availabilityService.findAll(instructorId);
  }
}
