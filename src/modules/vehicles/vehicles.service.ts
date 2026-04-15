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

  async upsertByInstructor(
    instructorId: string,
    vehicleData: Partial<CreateVehicleDto>,
  ) {
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: { instructorId },
    });

    if (existingVehicle) {
      return this.prisma.vehicle.update({
        where: { id: existingVehicle.id },
        data: {
          model: vehicleData.model,
          plate: vehicleData.plate,
          year: vehicleData.year,
          transmission: vehicleData.transmission,
          vehiclePhoto: vehicleData.vehiclePhoto,
        },
      });
    }

    return this.prisma.vehicle.create({
      data: {
        instructorId,
        model: vehicleData.model ?? '',
        plate: vehicleData.plate ?? '',
        year: vehicleData.year,
        transmission: vehicleData.transmission,
        vehiclePhoto: vehicleData.vehiclePhoto,
      },
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
