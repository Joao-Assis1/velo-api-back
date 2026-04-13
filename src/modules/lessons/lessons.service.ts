import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async create(createLessonDto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: {
        studentId: createLessonDto.studentId,
        instructorId: createLessonDto.instructorId,
        vehicleId: createLessonDto.vehicleId,
        date: new Date(createLessonDto.date),
        startTime: createLessonDto.startTime,
        endTime: createLessonDto.endTime,
        price: createLessonDto.price,
        status: 'upcoming',
      },
    });
  }

  async findAll(studentId?: string, instructorId?: string) {
    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (instructorId) where.instructorId = instructorId;

    return this.prisma.lesson.findMany({
      where,
      include: {
        student: true,
        instructor: true,
        vehicle: true,
      },
    });
  }

  async update(id: string, updateLessonDto: UpdateLessonDto) {
    return this.prisma.lesson.update({
      where: { id },
      data: updateLessonDto,
    });
  }

  async checkIn(id: string) {
    return this.prisma.lesson.update({
      where: { id },
      data: {
        status: 'in-progress',
        checkInTime: new Date(),
      },
    });
  }

  async checkOut(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    const checkOutTime = new Date();
    
    let durationMinutes: number | null = null;
    if (lesson?.checkInTime) {
      durationMinutes = Math.round((checkOutTime.getTime() - lesson.checkInTime.getTime()) / 60000);
    }

    return this.prisma.lesson.update({
      where: { id },
      data: {
        status: 'completed',
        checkOutTime,
        durationMinutes,
      },
    });
  }

  async giveInstructorFeedback(id: string, feedback: string) {
    return this.prisma.lesson.update({
      where: { id },
      data: { instructorFeedback: feedback },
    });
  }

  async giveStudentFeedback(id: string, rating: number, text: string) {
    return this.prisma.lesson.update({
      where: { id },
      data: { 
        studentFeedbackRating: rating,
        studentFeedbackText: text,
      },
    });
  }
}
