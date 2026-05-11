import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { Availability } from '@prisma/client';

interface AvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled?: boolean;
}

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async create(
    createAvailabilityDto: CreateAvailabilityDto,
  ): Promise<Availability> {
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

  async replaceInstructorAvailability(
    instructorId: string,
    availabilities: AvailabilityInput[],
  ): Promise<Availability[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({
        where: { instructorId },
      });

      if (availabilities && availabilities.length > 0) {
        await tx.availability.createMany({
          data: availabilities.map((availability) => ({
            instructorId,
            dayOfWeek: availability.dayOfWeek,
            startTime: availability.startTime,
            endTime: availability.endTime,
            isEnabled: availability.isEnabled ?? true,
          })),
        });
      }

      return tx.availability.findMany({ where: { instructorId } });
    });
  }

  async findAll(instructorId?: string): Promise<Availability[]> {
    if (instructorId) {
      return this.prisma.availability.findMany({
        where: { instructorId },
      });
    }
    return this.prisma.availability.findMany();
  }
}
