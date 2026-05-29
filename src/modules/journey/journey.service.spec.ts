import { Test, TestingModule } from '@nestjs/testing';
import { JourneyService } from './journey.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JourneyStage } from './types/journey-stage.enum';
import { MIN_PRACTICAL_MINUTES_FOR_READY } from './lib/journey-stages.const';

describe('JourneyService', () => {
  let service: JourneyService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneyService,
        {
          provide: PrismaService,
          useValue: {
            student: { findUnique: jest.fn(), update: jest.fn() },
            renachProcess: { findUnique: jest.fn() },
            lesson: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(JourneyService);
    prisma = module.get(PrismaService);
  });

  describe('computeStage', () => {
    it('throws NotFoundException when student does not exist', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.computeStage('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns REGISTERED for a brand-new student with no related data', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({
        id: 'stu-1',
        theoryCourseStartedAt: null,
        ladvNumber: null,
        ladvValidUntil: null,
        ladvOcrStatus: null,
        readyForPracticalExamAt: null,
      });
      (prisma.renachProcess.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.lesson.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.computeStage('stu-1');
      expect(result.stage).toBe(JourneyStage.REGISTERED);
    });

    it('aggregates only lessons that pass the CONTRAN integrity check', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({
        id: 'stu-1',
        theoryCourseStartedAt: new Date(),
        ladvNumber: 'LADV-1',
        ladvValidUntil: new Date(Date.now() + 86400000),
        ladvOcrStatus: 'PASS',
        readyForPracticalExamAt: null,
      });
      (prisma.renachProcess.findUnique as jest.Mock).mockResolvedValue({
        status: 'DONE',
        renachNumber: 'RNC',
      });
      (prisma.lesson.findMany as jest.Mock).mockResolvedValue([
        {
          status: 'completed',
          durationMinutes: 60,
          biometryStartStatus: 'SUCCESS',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: 'abc',
          disputeOpened: false,
        },
        // biometria falhou — não conta
        {
          status: 'completed',
          durationMinutes: 60,
          biometryStartStatus: 'FAILED',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: 'def',
          disputeOpened: false,
        },
        // disputa aberta — não conta
        {
          status: 'completed',
          durationMinutes: 60,
          biometryStartStatus: 'SUCCESS',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: 'ghi',
          disputeOpened: true,
        },
      ]);

      const result = await service.computeStage('stu-1');
      expect(result.stage).toBe(JourneyStage.PRACTICAL_IN_PROGRESS);
    });
  });

  describe('assertCanScheduleLesson', () => {
    it('throws BadRequestException when stage is below LADV_UPLOADED_VALID', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({
        id: 'stu-1',
        theoryCourseStartedAt: null,
        ladvNumber: null,
        ladvValidUntil: null,
        ladvOcrStatus: null,
        readyForPracticalExamAt: null,
      });
      (prisma.renachProcess.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.lesson.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.assertCanScheduleLesson('stu-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('declareReadyForExam', () => {
    it('throws when minimum legal minutes not met', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({
        id: 'stu-1',
        theoryCourseStartedAt: new Date(),
        ladvNumber: 'LADV-1',
        ladvValidUntil: new Date(Date.now() + 86400000),
        ladvOcrStatus: 'PASS',
        readyForPracticalExamAt: null,
      });
      (prisma.renachProcess.findUnique as jest.Mock).mockResolvedValue({
        status: 'DONE',
        renachNumber: 'RNC',
      });
      (prisma.lesson.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.declareReadyForExam('stu-1')).rejects.toThrow(BadRequestException);
    });

    it('sets readyForPracticalExamAt when minimum is met', async () => {
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({
        id: 'stu-1',
        theoryCourseStartedAt: new Date(),
        ladvNumber: 'LADV-1',
        ladvValidUntil: new Date(Date.now() + 86400000),
        ladvOcrStatus: 'PASS',
        readyForPracticalExamAt: null,
      });
      (prisma.renachProcess.findUnique as jest.Mock).mockResolvedValue({
        status: 'DONE',
        renachNumber: 'RNC',
      });
      (prisma.lesson.findMany as jest.Mock).mockResolvedValue([
        {
          status: 'completed',
          durationMinutes: MIN_PRACTICAL_MINUTES_FOR_READY + 10,
          biometryStartStatus: 'SUCCESS',
          biometryMidStatus: 'SUCCESS',
          biometryEndStatus: 'SUCCESS',
          integrityHash: 'h',
          disputeOpened: false,
        },
      ]);
      (prisma.student.update as jest.Mock).mockResolvedValue({});

      const result = await service.declareReadyForExam('stu-1');
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'stu-1' },
        data: expect.objectContaining({
          readyForPracticalExamAt: expect.any(Date),
          journeyStage: JourneyStage.READY_FOR_PRACTICAL_EXAM,
        }),
      });
      expect(result.stage).toBe(JourneyStage.READY_FOR_PRACTICAL_EXAM);
    });
  });
});
