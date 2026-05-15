import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { ChecklistService } from './checklist.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { Prisma, Student } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: { userId: string };
}

@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly checklistService: ChecklistService,
  ) {}

  @Post()
  create(
    @Body() createStudentDto: CreateStudentDto,
  ): Promise<Omit<Student, 'password'>> {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll(): Promise<Omit<Student, 'password'>[]> {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: Prisma.StudentUpdateInput,
  ): Promise<Omit<Student, 'password'>> {
    return this.studentsService.update(id, updateData);
  }

  @Get(':id/checklist')
  getChecklist(@Param('id') id: string) {
    return this.checklistService.getChecklist(id);
  }

  @Patch(':id/checklist/:step')
  updateChecklist(
    @Param('id') id: string,
    @Param('step') step: string,
    @Body('completed') completed: boolean,
  ) {
    return this.checklistService.updateStep(id, step, completed);
  }

  @Post('me/theory-course/start')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  startTheoryCourse(@Req() req: RequestWithUser) {
    return this.studentsService.startTheoryCourse(req.user.userId);
  }
}
