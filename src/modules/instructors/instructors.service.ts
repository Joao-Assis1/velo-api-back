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

  async update(id: string, data: any) {
    return this.prisma.instructor.update({
      where: { id },
      data,
      omit: this.omitPassword,
    });
  }

  async getEarnings(id: string, month?: string, year?: string) {
    const where: any = {
      instructorId: id,
      status: 'completed',
    };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 1);
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const result = await this.prisma.lesson.aggregate({
      _sum: {
        price: true,
      },
      where,
    });

    return {
      instructorId: id,
      earnings: result._sum.price || 0,
      month,
      year,
    };
  }
}
