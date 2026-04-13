import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';

@Injectable()
export class InstructorsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateInstructorDto) {
    return this.prisma.instructor.create({ data });
  }

  async findAll() {
    return this.prisma.instructor.findMany();
  }

  async findOne(id: string) {
    return this.prisma.instructor.findUnique({ where: { id } });
  }
}
