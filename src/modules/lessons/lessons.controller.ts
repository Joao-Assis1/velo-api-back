import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { RegisterBiometryDto } from './dto/register-biometry.dto';

@ApiTags('lessons')
@ApiBearerAuth()
@Controller('lessons')
@UseGuards(JwtAuthGuard)
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
  checkIn(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.lessonsService.checkIn(id, req.user.userId);
  }

  @Patch(':id/checkout')
  checkOut(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.lessonsService.checkOut(id, req.user.userId);
  }

  @Patch(':id/cancel')
  cancelLesson(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.lessonsService.cancelLesson(id, req.user.userId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Instrutor aceita a aula — processa pagamento e move para upcoming' })
  acceptLesson(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.lessonsService.accept(id, req.user.userId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Instrutor recusa a aula — cancela sem cobrança' })
  rejectLesson(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.lessonsService.reject(id, req.user.userId);
  }

  @Patch(':id/feedback-instructor')
  giveInstructorFeedback(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body('feedback') feedback: string,
  ) {
    return this.lessonsService.giveInstructorFeedback(id, req.user.userId, feedback);
  }

  @Patch(':id/feedback-student')
  giveStudentFeedback(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body('rating') rating: number,
    @Body('text') text: string,
  ) {
    return this.lessonsService.giveStudentFeedback(id, req.user.userId, rating, text);
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
