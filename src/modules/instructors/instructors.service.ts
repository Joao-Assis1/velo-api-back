import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';

@Injectable()
export class InstructorsService {
  constructor(private prisma: PrismaService) {}

  private readonly omitPassword = { password: true } as const;

  async create(data: CreateInstructorDto) {
    return this.prisma.instructor.create({ data, omit: this.omitPassword });
  }

  async findAll() {
    return this.prisma.instructor.findMany({
      omit: this.omitPassword,
      include: { vehicles: true, availabilities: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.instructor.findUnique({
      where: { id },
      omit: this.omitPassword,
      include: { vehicles: true, availabilities: true },
    });
  }
}
