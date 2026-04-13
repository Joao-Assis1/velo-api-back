import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateStudentDto) {
    return this.prisma.student.create({ data });
  }

  async findAll() {
    return this.prisma.student.findMany();
  }

  async findOne(id: string) {
    return this.prisma.student.findUnique({ where: { id } });
  }
}
