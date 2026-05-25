import { Test, TestingModule } from '@nestjs/testing';
import { TelemetriaService } from './telemetria.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NavigatorService } from './navigator.service';

describe('TelemetriaService', () => {
  let service: TelemetriaService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lesson: {
      findUnique: jest.fn(),
    },
    lessonTelemetry: {
      createMany: jest.fn(),
    },
  };

  const mockNavigatorService = {
    analyzeTelemetry: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetriaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NavigatorService,
          useValue: mockNavigatorService,
        },
      ],
    }).compile();

    service = module.get<TelemetriaService>(TelemetriaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerBatch', () => {
    const lessonId = 'test-lesson-id';
    const dto = {
      lessonId,
      points: [
        {
          lat: -23.5,
          lng: -46.6,
          velocity: 40,
          timestamp: new Date().toISOString(),
        },
        {
          lat: -23.6,
          lng: -46.7,
          velocity: 45,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    it('should register a batch of telemetry points successfully', async () => {
      const findUniqueSpy = jest
        .spyOn(prisma.lesson, 'findUnique')
        .mockResolvedValue({
          status: 'upcoming',
        } as any);
      const createManySpy = jest
        .spyOn(prisma.lessonTelemetry, 'createMany')
        .mockResolvedValue({
          count: 2,
        });

      const result = await service.registerBatch(dto);

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { id: lessonId },
        select: { status: true },
      });
      expect(createManySpy).toHaveBeenCalled();
      expect(result.count).toBe(2);
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(null);

      await expect(service.registerBatch(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if lesson status is completed', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue({
        id: lessonId,
        status: 'completed',
      });

      await expect(service.registerBatch(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if lesson status is cancelled', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue({
        id: lessonId,
        status: 'cancelled',
      });

      await expect(service.registerBatch(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
