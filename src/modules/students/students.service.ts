import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { Student, Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  private readonly omitPassword = { password: true } as const;

  async create(data: CreateStudentDto): Promise<Omit<Student, 'password'>> {
    return this.prisma.student.create({
      data,
      omit: this.omitPassword,
    }) as unknown as Promise<Omit<Student, 'password'>>;
  }

  async findAll(): Promise<Omit<Student, 'password'>[]> {
    return this.prisma.student.findMany({
      omit: this.omitPassword,
    }) as unknown as Promise<Omit<Student, 'password'>[]>;
  }

  async findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        cpf: true,
        profilePicture: true,
        ladvUploaded: true,
        ladv_document_url: true,
        ladv_validation_date: true,
        termsAcceptedAt: true,
        birthDate: true,
        motherName: true,
        ufDomicile: true,
        intendedCategory: true,
        createdAt: true,
        updatedAt: true,
        paymentMethods: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.StudentUpdateInput,
  ): Promise<Omit<Student, 'password'>> {
    return this.prisma.student.update({
      where: { id },
      data,
      omit: this.omitPassword,
    }) as unknown as Promise<Omit<Student, 'password'>>;
  }

  async startTheoryCourse(studentId: string) {
    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: { theoryCourseStartedAt: new Date() },
      select: {
        id: true,
        theoryCourseStartedAt: true,
      },
    });
    const state = await this.journey.refresh(studentId);
    return {
      theoryCourseStartedAt: updated.theoryCourseStartedAt,
      stage: state.stage,
    };
  }
}
