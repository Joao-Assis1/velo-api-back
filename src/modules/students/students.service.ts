import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  private readonly omitPassword = { password: true } as const;

  async create(data: CreateStudentDto) {
    return this.prisma.student.create({ data, omit: this.omitPassword });
  }

  async findAll() {
    return this.prisma.student.findMany({ omit: this.omitPassword });
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
        createdAt: true,
        updatedAt: true,
        paymentMethods: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.student.update({
      where: { id },
      data,
      omit: this.omitPassword,
    });
  }

  async uploadLadv(id: string, fileName: string, filePath: string) {
    return this.prisma.student.update({
      where: { id },
      data: {
        ladvUploaded: true,
        ladv_document_url: filePath,
        ladv_validation_date: new Date(),
      },
      omit: this.omitPassword,
    });
  }

  async getLadvStatus(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        ladvUploaded: true,
        ladv_validation_date: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return {
      studentId: student.id,
      ladvUploaded: student.ladvUploaded,
      ladvValidationDate: student.ladv_validation_date,
      canBook: student.ladvUploaded,
    };
  }
}
