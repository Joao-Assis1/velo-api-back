import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { RegisterBiometryDto } from './dto/register-biometry.dto';

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

  @Patch(':id/cancel')
  cancelLesson(@Param('id') id: string) {
    return this.lessonsService.cancelLesson(id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Instrutor aceita a aula — processa pagamento e move para upcoming' })
  acceptLesson(@Param('id') id: string) {
    return this.lessonsService.accept(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Instrutor recusa a aula — cancela sem cobrança' })
  rejectLesson(@Param('id') id: string) {
    return this.lessonsService.reject(id);
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

  @Post(':id/biometry')
  @ApiOperation({ summary: 'Registrar validação biométrica com geofencing' })
  @ApiResponse({ status: 201, description: 'Biometria registrada com sucesso' })
  @ApiResponse({ status: 403, description: 'Fora do raio de 50m (Geofencing)' })
  registerBiometry(
    @Param('id') id: string,
    @Body() registerBiometryDto: RegisterBiometryDto,
  ) {
    return this.lessonsService.registerBiometry(id, registerBiometryDto);
  }
}
