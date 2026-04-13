import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@ApiTags('lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  @Get()
  findAll(
    @Query('studentId') studentId?: string,
    @Query('instructorId') instructorId?: string,
  ) {
    return this.lessonsService.findAll(studentId, instructorId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLessonDto: UpdateLessonDto) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Patch(':id/checkin')
  checkIn(@Param('id') id: string) {
    return this.lessonsService.checkIn(id);
  }

  @Patch(':id/checkout')
  checkOut(@Param('id') id: string) {
    return this.lessonsService.checkOut(id);
  }

  @Patch(':id/feedback-instructor')
  giveInstructorFeedback(
    @Param('id') id: string,
    @Body('feedback') feedback: string,
  ) {
    return this.lessonsService.giveInstructorFeedback(id, feedback);
  }

  @Patch(':id/feedback-student')
  giveStudentFeedback(
    @Param('id') id: string,
    @Body('rating') rating: number,
    @Body('text') text: string,
  ) {
    return this.lessonsService.giveStudentFeedback(id, rating, text);
  }
}
