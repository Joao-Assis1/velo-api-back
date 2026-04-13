import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async create(createAvailabilityDto: CreateAvailabilityDto) {
    return this.prisma.availability.create({
      data: {
        dayOfWeek: createAvailabilityDto.dayOfWeek,
        startTime: createAvailabilityDto.startTime,
        endTime: createAvailabilityDto.endTime,
        isEnabled: createAvailabilityDto.isEnabled ?? true,
        instructorId: createAvailabilityDto.instructorId,
      },
    });
  }

  async findAll(instructorId?: string) {
    if (instructorId) {
      return this.prisma.availability.findMany({
        where: { instructorId },
      });
    }
    return this.prisma.availability.findMany();
  }
}
