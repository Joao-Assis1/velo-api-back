import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { ListClinicsQueryDto } from './dto/list-clinics-query.dto';
import { ClinicDto, PaginatedClinicsDto } from './dto/clinic.dto';

const CLINICS_CACHE_TTL = 5 * 60 * 1000; // 5 min — catálogo de clínicas é quase estático

@Injectable()
export class ClinicsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async list(query: ListClinicsQueryDto): Promise<PaginatedClinicsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const cacheKey = `clinics:list:${query.type ?? ''}:${query.uf ?? ''}:${query.city ?? ''}:${page}:${pageSize}`;

    const cached = await this.cache.get<PaginatedClinicsDto>(cacheKey);
    if (cached) return cached;

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

    const result: PaginatedClinicsDto = { items: items as ClinicDto[], page, pageSize, total };
    await this.cache.set(cacheKey, result, CLINICS_CACHE_TTL);
    return result;
  }

  async findById(id: string): Promise<ClinicDto> {
    const cacheKey = `clinics:id:${id}`;
    const cached = await this.cache.get<ClinicDto>(cacheKey);
    if (cached) return cached;

    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new NotFoundException(`Clinic ${id} not found`);

    await this.cache.set(cacheKey, clinic, CLINICS_CACHE_TTL);
    return clinic as ClinicDto;
  }
}
