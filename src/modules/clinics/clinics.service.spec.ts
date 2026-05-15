import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClinicsService', () => {
  let service: ClinicsService;
  let prisma: {
    clinic: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      clinic: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ClinicsService);
  });

  describe('list', () => {
    it('filters by type, uf and city and applies pagination defaults', async () => {
      prisma.clinic.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'Clínica A',
          type: 'MEDICAL',
          city: 'Campo Grande',
          uf: 'MS',
          address: '',
          phone: null,
          price: 200,
          isActive: true,
        },
      ]);
      prisma.clinic.count.mockResolvedValue(1);

      const result = await service.list({
        type: 'MEDICAL',
        uf: 'MS',
        city: 'Campo Grande',
      });

      expect(prisma.clinic.findMany).toHaveBeenCalledWith({
        where: { type: 'MEDICAL', uf: 'MS', city: 'Campo Grande', isActive: true },
        skip: 0,
        take: 20,
        orderBy: { name: 'asc' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.total).toBe(1);
    });

    it('hides inactive clinics by default', async () => {
      prisma.clinic.findMany.mockResolvedValue([]);
      prisma.clinic.count.mockResolvedValue(0);
      await service.list({});
      expect(prisma.clinic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('applies page=2 pageSize=10 → skip=10 take=10', async () => {
      prisma.clinic.findMany.mockResolvedValue([]);
      prisma.clinic.count.mockResolvedValue(0);
      await service.list({ page: 2, pageSize: 10 });
      expect(prisma.clinic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('findById', () => {
    it('returns the clinic when found', async () => {
      prisma.clinic.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Clínica X',
        type: 'PSYCHOLOGICAL',
        city: 'Campo Grande',
        uf: 'MS',
        address: 'Rua Antônio Maria Coelho, 123',
        phone: null,
        price: 180,
        isActive: true,
      });
      const r = await service.findById('c1');
      expect(r.id).toBe('c1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.clinic.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
