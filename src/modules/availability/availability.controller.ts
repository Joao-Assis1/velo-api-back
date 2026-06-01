import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Body,
  Query,
  Put,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @Req() req: RequestWithUser,
  ): Promise<Availability> {
    if (req.user.userId !== createAvailabilityDto.instructorId) {
      throw new ForbiddenException(
        'You can only create availability for your own account',
      );
    }
    return this.availabilityService.create(createAvailabilityDto);
  }

  @Put('instructor/:instructorId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateByInstructor(
    @Param('instructorId') instructorId: string,
    @Req() req: RequestWithUser,
    @Body() availabilities: AvailabilityInput[],
  ): Promise<Availability[]> {
    if (req.user.userId !== instructorId) {
      throw new ForbiddenException('You can only update your own availability');
    }
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
