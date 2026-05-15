import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListClinicsQueryDto } from './dto/list-clinics-query.dto';
import { ClinicDto, PaginatedClinicsDto } from './dto/clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListClinicsQueryDto): Promise<PaginatedClinicsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = { isActive: true };
    if (query.type) where.type = query.type;
    if (query.uf) where.uf = query.uf;
    if (query.city) where.city = query.city;

    const [items, total] = await Promise.all([
      this.prisma.clinic.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.clinic.count({ where }),
    ]);

    return {
      items: items as ClinicDto[],
      page,
      pageSize,
      total,
    };
  }

  async findById(id: string): Promise<ClinicDto> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new NotFoundException(`Clinic ${id} not found`);
    return clinic as ClinicDto;
  }
}
