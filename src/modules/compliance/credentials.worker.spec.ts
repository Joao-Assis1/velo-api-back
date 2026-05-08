import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsWorker } from './credentials.worker';
import { PrismaService } from '../prisma/prisma.service';

describe('CredentialsWorker', () => {
  let worker: CredentialsWorker;
  let prisma: PrismaService;

  const mockPrismaService = {
    instructor: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    student: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsWorker,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    worker = module.get<CredentialsWorker>(CredentialsWorker);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  describe('handleExpiredCredentials', () => {
    it('should identify and block instructors with expired CNH', async () => {
      const expiredInstructor = { id: 'inst-1', name: 'Pedro', cnhExpiry: '2020-01-01' };
      mockPrismaService.instructor.findMany.mockResolvedValue([expiredInstructor]);
      mockPrismaService.instructor.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.student.findMany.mockResolvedValue([]);

      await worker.handleExpiredCredentials();

      expect(mockPrismaService.instructor.findMany).toHaveBeenCalled();
      expect(mockPrismaService.instructor.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['inst-1'] },
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should invalidate LADV for students with expired validation date', async () => {
      const expiredStudent = { id: 'stud-1', name: 'Joao' };
      mockPrismaService.instructor.findMany.mockResolvedValue([]);
      mockPrismaService.student.findMany.mockResolvedValue([expiredStudent]);
      mockPrismaService.student.updateMany.mockResolvedValue({ count: 1 });

      await worker.handleExpiredCredentials();

      expect(mockPrismaService.student.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['stud-1'] },
        },
        data: {
          ladvUploaded: false,
        },
      });
    });
  });
});
