import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TestModeGuard } from '../../common/test-mode/test-mode.guard';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { InstructorsService } from './instructors.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';

@ApiTags('instructors')
@Controller('instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Post()
  create(@Body() createInstructorDto: CreateInstructorDto) {
    return this.instructorsService.create(createInstructorDto);
  }

  @Post('me/seed-test')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TestModeGuard)
  @HttpCode(200)
  async seedTest(@Req() req: RequestWithUser) {
    return this.instructorsService.seedTest(req.user.userId);
  }

  @Get()
  findAll() {
    return this.instructorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.instructorsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() updateData: UpdateInstructorDto,
  ) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.instructorsService.update(id, updateData);
  }

  @Get(':id/earnings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getEarnings(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('You can only view your own earnings');
    }
    return this.instructorsService.getEarnings(id, month, year);
  }
}
