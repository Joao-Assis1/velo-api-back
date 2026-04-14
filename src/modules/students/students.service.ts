import { Injectable } from '@nestjs/common';
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
      omit: this.omitPassword,
    });
  }
}
