import { Test, TestingModule } from '@nestjs/testing';
import { NavigatorService, LessonEventType } from './navigator.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NavigatorService', () => {
  let service: NavigatorService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lessonEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavigatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NavigatorService>(NavigatorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeTelemetry', () => {
    const lessonId = 'test-lesson';

    it('should detect speeding events', async () => {
      const points = [
        { lat: 0, lng: 0, velocity: 40, timestamp: '2024-01-01T10:00:00Z' },
        { lat: 1, lng: 1, velocity: 70, timestamp: '2024-01-01T10:01:00Z' }, // Speeding
      ];

      const createSpy = jest
        .spyOn(prisma.lessonEvent, 'create')
        .mockResolvedValue({} as any);

      await service.analyzeTelemetry(lessonId, points);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lessonId,
            type: LessonEventType.SPEED_LIMIT,
            lat: 1,
            lng: 1,
          }),
        }),
      );
    });

    it('should not detect speeding if velocity is within threshold', async () => {
      const points = [
        { lat: 0, lng: 0, velocity: 50, timestamp: '2024-01-01T10:00:00Z' },
      ];

      const createSpy = jest.spyOn(prisma.lessonEvent, 'create');

      await service.analyzeTelemetry(lessonId, points);

      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
