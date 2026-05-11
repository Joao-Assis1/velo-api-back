import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { ChecklistService } from './checklist.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { Prisma, Student } from '@prisma/client';

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

  @Post(':id/ladv-upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadLadv(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Omit<Student, 'password'>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.studentsService.uploadLadv(id, file.originalname, file.path);
  }

  @Get(':id/ladv-status')
  getLadvStatus(@Param('id') id: string) {
    return this.studentsService.getLadvStatus(id);
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
}
