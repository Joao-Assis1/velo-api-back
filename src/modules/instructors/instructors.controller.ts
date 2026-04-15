import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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

  @Get()
  findAll() {
    return this.instructorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.instructorsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: UpdateInstructorDto) {
    return this.instructorsService.update(id, updateData);
  }

  @Get(':id/earnings')
  getEarnings(
    @Param('id') id: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.instructorsService.getEarnings(id, month, year);
  }
}
