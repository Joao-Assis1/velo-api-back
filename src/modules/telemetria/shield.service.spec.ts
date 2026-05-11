import { Test, TestingModule } from '@nestjs/testing';
import { ShieldService } from './shield.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ShieldService', () => {
  let service: ShieldService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lessonTelemetry: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShieldService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ShieldService>(ShieldService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateLessonHash', () => {
    const lessonId = 'lesson-123';
    const mockPoints = [
      {
        lessonId,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        lat: -23.5,
        lng: -46.6,
        velocity: 40,
      },
      {
        lessonId,
        timestamp: new Date('2024-01-01T10:01:00Z'),
        lat: -23.6,
        lng: -46.7,
        velocity: 45,
      },
    ];

    it('should generate a consistent SHA-256 hash from telemetry points', async () => {
      mockPrismaService.lessonTelemetry.findMany.mockResolvedValue(mockPoints);

      const hash1 = await service.generateLessonHash(lessonId);
      const hash2 = await service.generateLessonHash(lessonId);

      expect(hash1).toBeDefined();
      expect(hash1.length).toBe(64); // SHA-256 hex length
      expect(hash1).toBe(hash2); // Consistency check
      expect(mockPrismaService.lessonTelemetry.findMany).toHaveBeenCalledWith({
        where: { lessonId },
        orderBy: { timestamp: 'asc' },
      });
    });

    it('should generate a hash even if no points exist', async () => {
      mockPrismaService.lessonTelemetry.findMany.mockResolvedValue([]);

      const hash = await service.generateLessonHash(lessonId);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });
});
