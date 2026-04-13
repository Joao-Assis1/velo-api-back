import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(createVehicleDto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: createVehicleDto,
    });
  }

  async findAll(instructorId?: string) {
    if (instructorId) {
      return this.prisma.vehicle.findMany({
        where: { instructorId },
      });
    }
    return this.prisma.vehicle.findMany();
  }
}
